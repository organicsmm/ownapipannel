import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const TERMINAL_OK = ["completed", "complete", "success", "partial"];
const TERMINAL_BAD = ["cancelled", "canceled", "canscelled", "refunded", "refund", "error", "failed"];

function getProviderError(result: any): string | null {
  if (!result) return "Empty provider response";
  if (result.error) return typeof result.error === "string" ? result.error : JSON.stringify(result.error);
  const status = String(result.status || "").toLowerCase();
  const message = String(result.message || result.msg || "").trim();
  if (["fail", "failed", "error", "false"].includes(status)) return message || `Provider status: ${result.status}`;
  if (!result.order && !result.id) {
    const raw = JSON.stringify(result);
    if (/active order|busy|already|wait|try again|fail|error/i.test(raw)) return message || raw;
  }
  return null;
}

function isTemporaryProviderBlock(message: string): boolean {
  return /less than min|minimal|min quantity|minimum|below|busy|already active|active order|wait until|wait|try again|temporar|duplicate|same link/i.test(message);
}

function deferBusyRunMinutes(runId: string, message: string, minMinutes = 4, spreadMinutes = 6) {
  const retryAt = new Date(Date.now() + (minMinutes + Math.random() * spreadMinutes) * 60 * 1000).toISOString();
  return supabase
    .from("organic_run_schedule")
    .update({
      scheduled_at: retryAt,
      error_message: message,
      last_status_check: new Date().toISOString(),
    })
    .eq("id", runId)
    .eq("status", "pending");
}

// Use head:true count queries instead of pulling every row — O(1) regardless of run count.
async function countRuns(itemId: string, status: string): Promise<number> {
  const { count } = await supabase
    .from("organic_run_schedule")
    .select("*", { count: "exact", head: true })
    .eq("engagement_order_item_id", itemId)
    .eq("status", status);
  return count || 0;
}

async function recomputeStatuses(itemId: string, engOrderId: string) {
  const { count: total } = await supabase
    .from("organic_run_schedule")
    .select("*", { count: "exact", head: true })
    .eq("engagement_order_item_id", itemId);
  if (!total) return;
  const [done, failed, cancelled, pending, started] = await Promise.all([
    countRuns(itemId, "completed"),
    countRuns(itemId, "failed"),
    countRuns(itemId, "cancelled"),
    countRuns(itemId, "pending"),
    countRuns(itemId, "started"),
  ]);
  const active = pending + started;
  let itemStatus = "processing";
  if (active > 0) itemStatus = "processing";
  else if (done === total) itemStatus = "completed";
  else if (done > 0 && done + failed + cancelled === total) itemStatus = "partial";
  else if (failed + cancelled === total) itemStatus = "failed";
  await supabase.from("engagement_order_items").update({ status: itemStatus }).eq("id", itemId);

  const { data: items } = await supabase.from("engagement_order_items").select("status").eq("engagement_order_id", engOrderId);
  if (!items) return;
  const t = items.length;
  const c = items.filter((i: any) => i.status === "completed").length;
  const p = items.filter((i: any) => i.status === "partial").length;
  const f = items.filter((i: any) => i.status === "failed").length;
  const x = items.filter((i: any) => i.status === "cancelled").length;
  const a = items.filter((i: any) => i.status === "processing" || i.status === "pending").length;
  let s = "processing";
  if (c === t) s = "completed";
  else if (a === 0 && c + p + f + x === t) s = c > 0 ? "partial" : f > 0 ? "failed" : "cancelled";
  await supabase.from("engagement_orders").update({ status: s }).eq("id", engOrderId).neq("status", "cancelled");
}

// ===== POLL STARTED RUNS (check real provider status) =====
async function pollStartedRuns() {
  let polled = 0, finished = 0, stillRunning = 0, reFailed = 0;
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data: startedRuns } = await supabase
    .from("organic_run_schedule")
    .select(`
      id, run_number, quantity_to_send, provider_order_id, provider_account_id, provider_status, retry_count, started_at,
      engagement_order_item:engagement_order_items!inner(
        id, engagement_type, status,
        engagement_order:engagement_orders!inner(id, status, use_user_api)
      )
    `)
    .eq("status", "started")
    .not("provider_order_id", "is", null)
    .not("provider_account_id", "is", null)
    .eq("engagement_order_item.engagement_order.use_user_api", true)
    .or(`last_status_check.is.null,last_status_check.lt.${fiveMinAgo}`)
    .order("last_status_check", { ascending: true, nullsFirst: true })
    .limit(20);

  for (const run of (startedRuns || [])) {
    const item = (run as any).engagement_order_item;
    const eo = item?.engagement_order;
    if (!eo || !item) continue;
    if (eo.status === "cancelled" || item.status === "cancelled") {
      await supabase.from("organic_run_schedule").update({
        status: "cancelled",
        error_message: "Order cancelled by user",
        completed_at: new Date().toISOString(),
        last_status_check: new Date().toISOString(),
      }).eq("id", run.id);
      continue;
    }

    // Look up the user_provider_account used for this run
    const { data: acc } = await supabase
      .from("user_provider_accounts")
      .select("id, api_url, api_key, name")
      .eq("id", (run as any).provider_account_id)
      .maybeSingle();
    if (!acc) continue;

    try {
      const form = new URLSearchParams();
      form.append("key", acc.api_key);
      form.append("action", "status");
      form.append("order", String(run.provider_order_id));

      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 6000);
      const resp = await fetch(acc.api_url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
        signal: ctrl.signal,
      });
      clearTimeout(tid);
      const text = await resp.text();
      let result: any;
      try { result = JSON.parse(text); } catch { result = { error: text }; }
      polled++;

      if (result?.error) {
        await supabase.from("organic_run_schedule").update({
          last_status_check: new Date().toISOString(),
          provider_response: result,
        }).eq("id", run.id);
        stillRunning++;
        continue;
      }

      const providerStatus = String(result.status || "").toLowerCase();
      const startCount = parseInt(result.start_count) || null;
      const remains = parseInt(result.remains);
      const remainsNum = isNaN(remains) ? null : remains;
      const charge = parseFloat(result.charge) || null;

      const tracking: any = {
        provider_status: result.status,
        provider_start_count: startCount,
        provider_remains: remainsNum,
        provider_charge: charge,
        provider_response: result,
        last_status_check: new Date().toISOString(),
      };

      if (TERMINAL_OK.includes(providerStatus) || (remainsNum === 0 && !TERMINAL_BAD.includes(providerStatus))) {
        await supabase.from("organic_run_schedule").update({
          ...tracking,
          status: "completed",
          completed_at: new Date().toISOString(),
          error_message: providerStatus === "partial" ? `Partial: ${remainsNum ?? 0} remaining` : null,
        }).eq("id", run.id);
        finished++;
        await recomputeStatuses(item.id, eo.id);
      } else if (TERMINAL_BAD.includes(providerStatus)) {
        // Provider cancelled / refunded / failed
        await supabase.from("organic_run_schedule").update({
          ...tracking,
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: `Provider ${result.status}`,
        }).eq("id", run.id);
        reFailed++;
        await recomputeStatuses(item.id, eo.id);
      } else {
        // Still pending / in progress / processing
        await supabase.from("organic_run_schedule").update(tracking).eq("id", run.id);
        stillRunning++;
      }
    } catch (e: any) {
      await supabase.from("organic_run_schedule").update({
        last_status_check: new Date().toISOString(),
        error_message: `Status check network: ${e?.message || "unknown"}`,
      }).eq("id", run.id);
      stillRunning++;
    }
    await new Promise(r => setTimeout(r, 50));
  }

  return { polled, finished, stillRunning, reFailed };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let requestBody: any = {};
    try { requestBody = await req.json(); } catch { requestBody = {}; }
    if (requestBody?.chained === true) {
      return new Response(JSON.stringify({ success: true, ignored: "legacy self-trigger disabled" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (requestBody?.background !== true) {
      const backgroundBody = {
        ...requestBody,
        background: true,
        depth: Number(requestBody?.depth || 0),
      };
      const trigger = async () => {
        try {
          await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/execute-user-runs`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
            },
            body: JSON.stringify(backgroundBody),
          });
        } catch (e) { console.error("background executor trigger failed:", e); }
      };
      if (typeof (globalThis as any).EdgeRuntime?.waitUntil === "function") {
        (globalThis as any).EdgeRuntime.waitUntil(trigger());
      } else {
        trigger();
      }
      return new Response(JSON.stringify({ accepted: true, background: true }), { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 0) RECOVERY: 'started' runs with NULL provider_order_id.
    //    If provider clearly rejected the order as busy/failed, requeue it so priority
    //    rotation can try the next provider. If response was lost, keep the old safe
    //    behavior after 10 min to avoid duplicate delivery.
    const oneMinAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { data: rejectedNullRuns } = await supabase
      .from("organic_run_schedule")
      .select("id")
      .eq("status", "started")
      .is("provider_order_id", null)
      .lt("started_at", oneMinAgo)
      .not("provider_response", "is", null)
      .filter("provider_response", "cs", '{}')
      .limit(200);
    let requeuedRejected = 0;
    for (const rr of (rejectedNullRuns || [])) {
      await supabase.rpc("requeue_user_api_runs_without_provider_order", { _max_age_minutes: 1 });
      requeuedRejected = (rejectedNullRuns || []).length;
      break;
    }

    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: stuckRuns } = await supabase
      .from("organic_run_schedule")
      .select("id, engagement_order_item_id, engagement_order_item:engagement_order_items!inner(id, engagement_order:engagement_orders!inner(id, use_user_api, status))")
      .eq("status", "started")
      .is("provider_order_id", null)
      .lt("started_at", tenMinAgo)
      .eq("engagement_order_item.engagement_order.use_user_api", true)
      .limit(200);

    let recovered = 0;
    for (const sr of (stuckRuns || [])) {
      const it: any = (sr as any).engagement_order_item;
      const eo = it?.engagement_order;
      if (!eo || eo.status === "cancelled") continue;
      await supabase.from("organic_run_schedule").update({
        status: "completed",
        completed_at: new Date().toISOString(),
        provider_status: "Unknown",
        provider_remains: 0,
        error_message: "Provider response lost; counted as delivered to avoid duplicate retry",
        last_status_check: new Date().toISOString(),
      }).eq("id", sr.id);
      await recomputeStatuses(it.id, eo.id);
      recovered++;
    }

    // 1) POLL existing started runs first — check real provider status
    const pollStats = await pollStartedRuns();

    const nowIso = new Date().toISOString();
    // 2) Pull due pending runs fairly per engagement type.
    // A large views backlog must not starve likes/comments/shares/reposts/saves.
    const priorityOrderIds = new Set<string>();
    const requestedOrderNumbers = Array.isArray(requestBody?.orders) ? requestBody.orders.map((n: any) => Number(n)).filter(Number.isFinite) : [];
    if (requestBody?.order_id) priorityOrderIds.add(String(requestBody.order_id));
    if (requestedOrderNumbers.length > 0) {
      const { data: requestedOrders } = await supabase
        .from("engagement_orders")
        .select("id")
        .in("order_number", requestedOrderNumbers)
        .eq("use_user_api", true);
      for (const requestedOrder of (requestedOrders || [])) priorityOrderIds.add(String(requestedOrder.id));
    }

    const runSelect = `
      id, run_number, scheduled_at, quantity_to_send, engagement_order_item_id, retry_count,
      engagement_order_item:engagement_order_items!inner(
        id, engagement_type, quantity, status,
        engagement_order:engagement_orders!inner(id, order_number, link, status, use_user_api, user_id, user_bundle_id, user_provider_account_id, created_at)
      )
    `;
    const dueTypes = ["views", "likes", "comments", "shares", "reposts", "saves", "followers", "subscribers", "retweets", "watch_hours"];
    const dueBatches = await Promise.all(dueTypes.map((engagementType) => supabase
      .from("organic_run_schedule")
      .select(runSelect)
      .eq("status", "pending")
      .not("engagement_order_item_id", "is", null)
      .lte("scheduled_at", nowIso)
      .eq("engagement_order_item.engagement_order.use_user_api", true)
      .eq("engagement_order_item.engagement_type", engagementType)
      .order("scheduled_at", { ascending: true })
      .limit(700)));

    let priorityDirectRuns: any[] = [];
    if (priorityOrderIds.size > 0) {
      const { data: priorityItems } = await supabase
        .from("engagement_order_items")
        .select("id")
        .in("engagement_order_id", Array.from(priorityOrderIds));
      const priorityItemIds = (priorityItems || []).map((it: any) => it.id).filter(Boolean);
      if (priorityItemIds.length > 0) {
        const { data: directRuns, error: directErr } = await supabase
          .from("organic_run_schedule")
          .select(runSelect)
          .eq("status", "pending")
          .not("engagement_order_item_id", "is", null)
          .lte("scheduled_at", nowIso)
          .in("engagement_order_item_id", priorityItemIds)
          .eq("engagement_order_item.engagement_order.use_user_api", true)
          .order("scheduled_at", { ascending: true })
          .limit(1000);
        if (directErr) {
          console.error("Fetch priority due runs error:", directErr);
        } else {
          priorityDirectRuns = directRuns || [];
        }
      }
    }

    const fetchError = dueBatches.find((batch) => batch.error)?.error;
    if (fetchError) {
      console.error("Fetch due runs error:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const uniqueDueRunMap = new Map<string, any>();
    for (const dueRun of [...priorityDirectRuns, ...dueBatches.flatMap((batch) => batch.data || [])]) {
      uniqueDueRunMap.set(String(dueRun.id), dueRun);
    }
    const allDueRuns = Array.from(uniqueDueRunMap.values())
      .sort((a: any, b: any) => {
        const ao = a.engagement_order_item?.engagement_order;
        const bo = b.engagement_order_item?.engagement_order;
        const orderDiff = Number(bo?.order_number || 0) - Number(ao?.order_number || 0);
        if (orderDiff !== 0) return orderDiff;
        return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
      });
    const priorityRuns = priorityOrderIds.size > 0
      ? allDueRuns.filter((dueRun: any) => priorityOrderIds.has(String(dueRun.engagement_order_item?.engagement_order?.id)))
      : [];
    const regularRuns = priorityOrderIds.size > 0
      ? allDueRuns.filter((dueRun: any) => !priorityOrderIds.has(String(dueRun.engagement_order_item?.engagement_order?.id)))
      : allDueRuns;
    const runCap = Math.min(80, Math.max(10, Number(requestBody?.max_runs || 45)));
    const runsPerLinkType = new Map<string, number>();
    const dueRuns: any[] = [];
    for (const dueRun of [...priorityRuns, ...regularRuns]) {
      const item = (dueRun as any).engagement_order_item;
      const eo = item?.engagement_order;
      const fairKey = `${eo?.link || ""}|${item?.engagement_type || ""}`;
      const pickedForKey = runsPerLinkType.get(fairKey) || 0;
      // Allow rotation to multiple providers for the same link/service, but stop
      // one massive backlog from consuming the whole minute and starving others.
      if (pickedForKey >= 5) continue;
      runsPerLinkType.set(fairKey, pickedForKey + 1);
      dueRuns.push(dueRun);
      if (dueRuns.length >= runCap) break;
    }

    let processed = 0, failed = 0, skipped = 0, deferredBusy = 0;

    for (const run of (dueRuns || [])) {
      const item = (run as any).engagement_order_item;
      const eo = item?.engagement_order;
      if (!eo || !item) { skipped++; continue; }
      const busyKey = `${eo.link || ""}|${item.engagement_type || ""}`;
      if (eo.status === "cancelled" || item.status === "cancelled") {
        await supabase.from("organic_run_schedule").update({ status: "cancelled", error_message: "Order/item cancelled", completed_at: new Date().toISOString() }).eq("id", run.id);
        skipped++; continue;
      }
      if (eo.status === "paused" || item.status === "paused") { skipped++; continue; }

      const { data: bi } = await supabase
        .from("user_bundle_items")
        .select("id, provider_service_id, user_provider_account_id")
        .eq("user_bundle_id", eo.user_bundle_id)
        .eq("engagement_type", item.engagement_type)
        .limit(1)
        .maybeSingle();

      if (!bi) {
        await supabase.from("organic_run_schedule").update({ status: "failed", error_message: "Bundle item not found" }).eq("id", run.id);
        failed++; continue;
      }

      const { data: mappings } = await supabase
        .from("user_bundle_item_providers")
        .select("priority, provider_service_id, user_provider_accounts(id, api_url, api_key, is_active, name)")
        .eq("user_bundle_item_id", (bi as any).id)
        .eq("is_active", true)
        .order("priority", { ascending: true });

      let candidates: Array<{ provider: any; providerServiceId: string; minQuantity?: number; maxQuantity?: number }> = (mappings || [])
        .map((m: any) => ({ provider: m.user_provider_accounts, providerServiceId: m.provider_service_id }))
        .filter(c => c.provider && c.provider.is_active);

      if (candidates.length === 0 && (bi as any).user_provider_account_id) {
        const { data: prov } = await supabase
          .from("user_provider_accounts")
          .select("id, api_url, api_key, is_active, name")
          .eq("id", (bi as any).user_provider_account_id)
          .maybeSingle();
        if (prov && prov.is_active) {
          candidates = [{ provider: prov, providerServiceId: (bi as any).provider_service_id }];
        }
      }

      if (candidates.length > 0) {
        const providerIds = [...new Set(candidates.map((c) => c.provider.id))];
        const serviceIds = [...new Set(candidates.map((c) => c.providerServiceId))];
        const { data: serviceLimits } = await supabase
          .from("user_services")
          .select("user_provider_account_id, provider_service_id, min_quantity, max_quantity")
          .in("user_provider_account_id", providerIds)
          .in("provider_service_id", serviceIds);
        const limits = new Map<string, any>();
        for (const svc of (serviceLimits || [])) {
          limits.set(`${svc.user_provider_account_id}|${svc.provider_service_id}`, svc);
        }
        candidates = candidates.map((c) => {
          const svc = limits.get(`${c.provider.id}|${c.providerServiceId}`);
          return {
            ...c,
            minQuantity: Number(svc?.min_quantity || 0),
            maxQuantity: Number(svc?.max_quantity || 0),
          };
        });
      }

      if (candidates.length === 0) {
        await supabase.from("organic_run_schedule").update({ status: "failed", error_message: "No active provider available" }).eq("id", run.id);
        failed++; continue;
      }

      let success = false;
      let lastErr = "";
      let lastResult: any = null;
      let usedProvider: any = candidates[0].provider;
      let usedOrderId: string | null = null;
      let attemptedProvider = false;
      let temporaryBlocked = false;
      let hardProviderError = false;

      for (const cand of candidates) {
        const minQuantity = Number(cand.minQuantity || 0);
        const maxQuantity = Number(cand.maxQuantity || 0);
        if (minQuantity > 0 && Number(run.quantity_to_send) < minQuantity) {
          lastErr = `[${cand.provider.name}] quantity ${run.quantity_to_send} below provider min ${minQuantity}; waiting for a suitable provider`;
          temporaryBlocked = true;
          continue;
        }
        if (maxQuantity > 0 && Number(run.quantity_to_send) > maxQuantity) {
          lastErr = `[${cand.provider.name}] quantity ${run.quantity_to_send} above provider max ${maxQuantity}`;
          hardProviderError = true;
          continue;
        }

        const { data: claimed, error: claimErr } = await supabase.rpc("claim_user_api_run_provider", {
          _run_id: run.id,
          _provider_account_id: cand.provider.id,
          _provider_account_name: cand.provider.name,
          _link: eo.link,
          _engagement_type: item.engagement_type,
        });

        if (claimErr) {
          lastErr = `Provider lock failed: ${claimErr.message || "unknown error"}`;
          console.error(`Run ${run.id}: ${lastErr}`);
          break;
        }

        if (!claimed) {
          lastErr = `[${cand.provider.name}] busy on this link/service`;
          temporaryBlocked = true;
          continue;
        }

        attemptedProvider = true;
        usedProvider = cand.provider;

        try {
          const form = new URLSearchParams();
          form.append("key", cand.provider.api_key);
          form.append("action", "add");
          form.append("service", cand.providerServiceId);
          form.append("link", eo.link);
          form.append("quantity", String(run.quantity_to_send));

          const ctrl = new AbortController();
          const tid = setTimeout(() => ctrl.abort(), 20000);
          const resp = await fetch(cand.provider.api_url, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: form.toString(),
            signal: ctrl.signal,
          });
          clearTimeout(tid);
          const text = await resp.text();
          let result: any;
          try { result = JSON.parse(text); } catch { result = { error: text }; }
          lastResult = result;

          const providerError = getProviderError(result);
          if (providerError) {
            lastErr = `[${cand.provider.name}] ${providerError}`;
            if (isTemporaryProviderBlock(lastErr)) {
              temporaryBlocked = true;
            } else {
              hardProviderError = true;
            }
            await supabase.from("organic_run_schedule").update({
              status: "pending",
              provider_account_id: null,
              provider_account_name: null,
              error_message: lastErr,
              provider_response: result,
              last_status_check: new Date().toISOString(),
            }).eq("id", run.id).eq("status", "started").eq("provider_account_id", cand.provider.id);
            continue;
          }
          usedOrderId = (result.order ?? result.id)?.toString() || null;
          success = true;
          break;
        } catch (e: any) {
          lastErr = `[${cand.provider.name}] Network: ${e?.message || "unknown"}; kept locked to avoid duplicate delivery`;
          await supabase.from("organic_run_schedule").update({
            status: "started",
            provider_account_id: cand.provider.id,
            provider_account_name: cand.provider.name,
            provider_order_id: null,
            provider_status: "Unknown",
            error_message: lastErr,
            last_status_check: new Date().toISOString(),
          }).eq("id", run.id).eq("status", "started").eq("provider_account_id", cand.provider.id);
          attemptedProvider = true;
          success = true;
          usedProvider = cand.provider;
          usedOrderId = null;
          break;
        }
      }

      if (!success && !attemptedProvider) {
        console.log(`Run ${run.id}: all providers busy on link "${eo.link}" (${item.engagement_type}), deferring`);
        await deferBusyRunMinutes(run.id, lastErr || "All providers busy on this link/service; deferred safely");
        deferredBusy++;
        skipped++;
        continue;
      }

      if (success) {
        // IMPORTANT: keep status='started' until provider reports real completion
        await supabase.from("organic_run_schedule").update({
          status: "started",
          provider_order_id: usedOrderId,
          provider_account_id: usedProvider.id,
          provider_account_name: usedProvider.name,
          provider_status: usedOrderId ? "Pending" : "Unknown",
          provider_response: lastResult,
          last_status_check: new Date().toISOString(),
        }).eq("id", run.id);
        processed++;
      } else if (temporaryBlocked && !hardProviderError) {
        await deferBusyRunMinutes(run.id, lastErr || "Provider temporarily unavailable for this run quantity; deferred safely");
        deferredBusy++;
        skipped++;
      } else {
        await supabase.from("organic_run_schedule").update({
          status: "failed",
          error_message: lastErr || "All providers failed",
          provider_response: lastResult,
          completed_at: new Date().toISOString(),
        }).eq("id", run.id);
        failed++;
      }

      await recomputeStatuses(item.id, eo.id);
    }

    const depth = Number(requestBody?.depth || 0);
    if ((dueRuns || []).length >= runCap && depth < 5) {
      const nextBody = { ...requestBody, background: true, depth: depth + 1, max_runs: runCap };
      const triggerNext = async () => {
        try {
          await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/execute-user-runs`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
            },
            body: JSON.stringify(nextBody),
          });
        } catch (e) { console.error("executor chain failed:", e); }
      };
      if (typeof (globalThis as any).EdgeRuntime?.waitUntil === "function") {
        (globalThis as any).EdgeRuntime.waitUntil(triggerNext());
      } else {
        triggerNext();
      }
    }

    // Cron invokes this every minute. Avoid large synchronous batches, which can time out.

    return new Response(JSON.stringify({
      success: true,
      processed,
      failed,
      skipped,
      deferredBusy,
      due: (dueRuns || []).length,
      runCap,
      depth,
      polled: pollStats,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("execute-user-runs error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
