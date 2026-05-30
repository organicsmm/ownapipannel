import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Auth: anon or service key allowed (for cron/self-trigger); user JWTs also OK
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const nowIso = new Date().toISOString();
    // Pull due pending runs for engagement orders with use_user_api=true
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

      // Find provider for this engagement_type from user_bundle_items
      const { data: bi } = await supabase
        .from("user_bundle_items")
        .select("provider_service_id, user_provider_accounts(api_url, api_key, is_active, name)")
        .eq("user_bundle_id", eo.user_bundle_id)
        .eq("engagement_type", item.engagement_type)
        .limit(1)
        .maybeSingle();

      if (!bi || !bi.user_provider_accounts || !(bi as any).user_provider_accounts.is_active) {
        await supabase.from("organic_run_schedule").update({ status: "failed", error_message: "User provider not found/inactive" }).eq("id", run.id);
        failed++; continue;
      }
      const provider = (bi as any).user_provider_accounts;
      const providerServiceId = (bi as any).provider_service_id;

      // Claim the run
      const { data: locked, error: lockErr } = await supabase
        .from("organic_run_schedule")
        .update({ status: "started", started_at: new Date().toISOString(), provider_account_name: provider.name })
        .eq("id", run.id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();
      if (lockErr || !locked) { skipped++; continue; }

      // Send to provider
      try {
        const form = new URLSearchParams();
        form.append("key", provider.api_key);
        form.append("action", "add");
        form.append("service", providerServiceId);
        form.append("link", eo.link);
        form.append("quantity", String(run.quantity_to_send));

        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 20000);
        const resp = await fetch(provider.api_url, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: form.toString(),
          signal: ctrl.signal,
        });
        clearTimeout(tid);
        const text = await resp.text();
        let result: any;
        try { result = JSON.parse(text); } catch { result = { error: text }; }

        if (result?.error) {
          const msg = typeof result.error === "string" ? result.error : JSON.stringify(result.error);
          await supabase.from("organic_run_schedule").update({
            status: "failed",
            error_message: msg,
            provider_response: result,
          }).eq("id", run.id);
          failed++;
        } else {
          const providerOrderId = (result.order ?? result.id)?.toString() || null;
          await supabase.from("organic_run_schedule").update({
            status: "completed",
            completed_at: new Date().toISOString(),
            provider_order_id: providerOrderId,
            provider_response: result,
          }).eq("id", run.id);
          processed++;
        }
      } catch (e: any) {
        await supabase.from("organic_run_schedule").update({
          status: "failed",
          error_message: `Network: ${e?.message || "unknown"}`,
        }).eq("id", run.id);
        failed++;
      }

      await recomputeStatuses(item.id, eo.id);
    }

    // Self-trigger if more runs are pending in the near future (any user-API order)
    const { data: upcoming } = await supabase
      .from("organic_run_schedule")
      .select("id, engagement_order_item:engagement_order_items!inner(engagement_order:engagement_orders!inner(use_user_api,status))")
      .eq("status", "pending")
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

    return new Response(JSON.stringify({ success: true, processed, failed, skipped, due: (dueRuns || []).length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("execute-user-runs error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
