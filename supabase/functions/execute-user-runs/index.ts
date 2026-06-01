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

async function recomputeStatuses(itemId: string, engOrderId: string) {
  const { data: runs } = await supabase
    .from("organic_run_schedule")
    .select("status")
    .eq("engagement_order_item_id", itemId);
  if (!runs || runs.length === 0) return;
  const total = runs.length;
  const done = runs.filter((r: any) => r.status === "completed").length;
  const failed = runs.filter((r: any) => r.status === "failed").length;
  const cancelled = runs.filter((r: any) => r.status === "cancelled").length;
  const active = runs.filter((r: any) => r.status === "pending" || r.status === "started").length;
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
    .limit(100);

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
      const tid = setTimeout(() => ctrl.abort(), 15000);
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
    await new Promise(r => setTimeout(r, 150));
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

    // 0) RECOVERY: 'started' runs with NULL provider_order_id older than 10 min
    //    were lost between lock and provider response. Auto-complete so UI unsticks.
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
        provider_status: "Completed",
        provider_remains: 0,
        error_message: "Auto-completed (provider response lost; assumed delivered)",
        last_status_check: new Date().toISOString(),
      }).eq("id", sr.id);
      await recomputeStatuses(it.id, eo.id);
      recovered++;
    }

    // 1) POLL existing started runs first — check real provider status
    const pollStats = await pollStartedRuns();

    const nowIso = new Date().toISOString();
    // 2) Pull due pending runs for user-API engagement orders
    const { data: dueRuns, error } = await supabase
      .from("organic_run_schedule")
      .select(`
        id, run_number, quantity_to_send, engagement_order_item_id, retry_count,
        engagement_order_item:engagement_order_items!inner(
          id, engagement_type, quantity, status,
          engagement_order:engagement_orders!inner(id, link, status, use_user_api, user_id, user_bundle_id, user_provider_account_id)
        )
      `)
      .eq("status", "pending")
      .not("engagement_order_item_id", "is", null)
      .lte("scheduled_at", nowIso)
      .eq("engagement_order_item.engagement_order.use_user_api", true)
      .order("scheduled_at", { ascending: true })
      .limit(50);

    if (error) {
      console.error("Fetch due runs error:", error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let processed = 0, failed = 0, skipped = 0;

    for (const run of (dueRuns || [])) {
      const item = (run as any).engagement_order_item;
      const eo = item?.engagement_order;
      if (!eo || !item) { skipped++; continue; }
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

      let candidates: Array<{ provider: any; providerServiceId: string }> = (mappings || [])
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

      for (const cand of candidates) {
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

          if (result?.error) {
            lastErr = `[${cand.provider.name}] ${typeof result.error === "string" ? result.error : JSON.stringify(result.error)}`;
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
          lastErr = `[${cand.provider.name}] Network: ${e?.message || "unknown"}`;
          await supabase.from("organic_run_schedule").update({
            status: "pending",
            provider_account_id: null,
            provider_account_name: null,
            error_message: lastErr,
            last_status_check: new Date().toISOString(),
          }).eq("id", run.id).eq("status", "started").eq("provider_account_id", cand.provider.id);
        }
      }

      if (!success && !attemptedProvider) {
        console.log(`Run ${run.id}: all providers busy on link "${eo.link}" (${item.engagement_type}), deferring`);
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
          provider_status: "Pending",
          provider_response: lastResult,
          last_status_check: new Date().toISOString(),
        }).eq("id", run.id);
        processed++;
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

    // Self-trigger to keep polling if anything is still running or upcoming
    const { data: upcoming } = await supabase
      .from("organic_run_schedule")
      .select("id, engagement_order_item:engagement_order_items!inner(engagement_order:engagement_orders!inner(use_user_api,status))")
      .in("status", ["pending", "started"])
      .eq("engagement_order_item.engagement_order.use_user_api", true)
      .not("engagement_order_item.engagement_order.status", "in", '("cancelled","completed")')
      .limit(1);

    if (upcoming && upcoming.length > 0) {
      const trigger = async () => {
        await new Promise(r => setTimeout(r, 55_000));
        try {
          await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/execute-user-runs`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
            },
            body: JSON.stringify({ chained: true }),
          });
        } catch (e) { console.error("self-trigger failed:", e); }
      };
      if (typeof (globalThis as any).EdgeRuntime?.waitUntil === "function") {
        (globalThis as any).EdgeRuntime.waitUntil(trigger());
      }
    }

    return new Response(JSON.stringify({
      success: true,
      processed,
      failed,
      skipped,
      due: (dueRuns || []).length,
      polled: pollStats,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("execute-user-runs error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
