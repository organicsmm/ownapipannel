// One-off reschedule: regenerates pending runs for all active engagement orders
// using provider minimum batch size + unique random quantities + randomized timing.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const ri = (lo: number, hi: number) => Math.floor(Math.random() * (hi - lo + 1)) + lo;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const body = await req.json().catch(() => ({} as any));
  const onlyOrderId: string | undefined = body?.order_id;
  const onlyUserId: string | undefined = body?.user_id;

  const work = async () => {
    // Fetch active orders
    let orderQ = supabase
      .from("engagement_orders")
      .select("id, user_id, user_bundle_id, status")
      .in("status", ["pending", "processing", "paused"]);
    if (onlyOrderId) orderQ = orderQ.eq("id", onlyOrderId);
    if (onlyUserId) orderQ = orderQ.eq("user_id", onlyUserId);
    const { data: orders, error: oErr } = await orderQ;
    if (oErr) { console.error("orders fetch", oErr); return; }


    let totalItems = 0;
    let totalNewRuns = 0;
    let totalDeleted = 0;
    const details: any[] = [];

    for (const ord of orders || []) {
      // Items for this order
      const { data: items } = await supabase
        .from("engagement_order_items")
        .select("id, engagement_type, quantity, status")
        .eq("engagement_order_id", ord.id);

      // Bundle items for provider min lookup
      const { data: bundleItems } = ord.user_bundle_id
        ? await supabase
            .from("user_bundle_items")
            .select("engagement_type, min_qty, max_qty")
            .eq("user_bundle_id", ord.user_bundle_id)
        : { data: [] as any[] };
      const minByType: Record<string, { min: number; max: number }> = {};
      for (const bi of bundleItems || []) {
        const t = String(bi.engagement_type);
        const m = Math.max(1, Number(bi.min_qty || 0) || 10);
        const mx = Number(bi.max_qty || 0) > 0 ? Number(bi.max_qty) : Number.MAX_SAFE_INTEGER;
        if (!minByType[t] || m < minByType[t].min) minByType[t] = { min: m, max: mx };
      }

      for (const item of items || []) {
        if (item.status === "cancelled" || item.status === "completed") continue;

        // Existing runs
        const { data: runs } = await supabase
          .from("organic_run_schedule")
          .select("id, status, scheduled_at, quantity_to_send")
          .eq("engagement_order_item_id", item.id);

        const completedSum = (runs || [])
          .filter((r: any) => r.status === "completed" || r.status === "started")
          .reduce((s: number, r: any) => s + Number(r.quantity_to_send || 0), 0);
        const remaining = Math.max(0, Number(item.quantity || 0) - completedSum);
        if (remaining < 1) continue;

        const pending = (runs || []).filter((r: any) => r.status === "pending");
        if (pending.length === 0) continue;

        const pendingTimes = pending
          .map((r: any) => new Date(r.scheduled_at).getTime())
          .sort((a: number, b: number) => a - b);
        const nowMs = Date.now();
        const startMs = Math.max(nowMs + 60 * 1000, pendingTimes[0] || nowMs);
        let endMs = Math.max(pendingTimes[pendingTimes.length - 1] || startMs, startMs);

        const pm = minByType[String(item.engagement_type)];
        const isViews = String(item.engagement_type).toLowerCase() === "views";
        // Enforce floor: views >= 100, everything else >= 10 (or provider min if higher)
        const providerMin = Math.max(isViews ? 100 : 10, pm?.min || (isViews ? 100 : 10));
        const providerMax = pm?.max || Number.MAX_SAFE_INTEGER;

        // Tight window near provider minimum
        // Views: min..min+50% (e.g. 100..150). Others: min..min+30 (e.g. 10..40, mostly 10-20)
        const qLo = providerMin;
        const qHiRaw = isViews
          ? Math.ceil(providerMin * 1.5)
          : providerMin + 30;
        const qHi = Math.min(providerMax, Math.max(qLo + 5, qHiRaw));

        // Target avg batch toward the lower end of the window so most runs are small
        const avgBatch = Math.max(providerMin, Math.floor(qLo + (qHi - qLo) * 0.35));
        // Max ~500 runs safety cap
        let numRuns = Math.min(500, Math.max(1, Math.floor(remaining / avgBatch)));
        // Recompute effective avg batch
        let effectiveBatch = Math.max(providerMin, Math.ceil(remaining / numRuns));
        // If effectiveBatch exceeds qHi (very large order), allow more runs
        while (effectiveBatch > qHi && numRuns < 500) {
          numRuns = Math.min(500, numRuns + Math.ceil((effectiveBatch - qHi) * numRuns / qHi) + 1);
          effectiveBatch = Math.max(providerMin, Math.ceil(remaining / numRuns));
        }
        numRuns = Math.max(1, Math.ceil(remaining / Math.max(providerMin, effectiveBatch)));

        // Ensure end window is at least numRuns * 3 minutes from start
        const minSpanMs = numRuns * 3 * 60 * 1000;
        if (endMs - startMs < minSpanMs) endMs = startMs + minSpanMs;


        // Generate unique random quantities summing to `remaining`
        const used = new Set<number>();
        const qtys: number[] = [];
        let left = remaining;
        for (let i = 0; i < numRuns; i++) {
          const isLast = i === numRuns - 1;
          let q: number;
          if (isLast) {
            q = Math.max(1, Math.min(providerMax, left));
          } else {
            const runsLeft = numRuns - i;
            // Window for this slot, also feasibility-constrained
            const lo = Math.max(qLo, left - (runsLeft - 1) * qHi);
            const hi = Math.min(qHi, Math.max(lo, left - (runsLeft - 1) * qLo));
            let cand = ri(lo, Math.max(lo, hi));
            // Make unique within window
            for (let k = 0; k < 80 && used.has(cand); k++) {
              const delta = ri(1, Math.max(2, Math.min(numRuns, hi - lo))) * (Math.random() < 0.5 ? -1 : 1);
              cand = Math.min(hi, Math.max(lo, cand + delta));
            }
            if (used.has(cand)) {
              for (let v = lo; v <= hi; v++) if (!used.has(v)) { cand = v; break; }
            }
            q = cand;
          }
          if (q < 1) q = 1;
          if (q > left) q = left;
          qtys.push(q);
          used.add(q);
          left -= q;
          if (left <= 0) break;
        }


        // If last collides with prior, try shifting by ±1
        if (qtys.length >= 2) {
          const last = qtys[qtys.length - 1];
          const prevSet = new Set(qtys.slice(0, -1));
          if (prevSet.has(last)) {
            for (let t = 0; t < 12; t++) {
              const shift = Math.random() < 0.5 ? -1 : 1;
              const np = qtys[qtys.length - 2] + shift;
              const nl = last - shift;
              if (np >= providerMin && np <= providerMax && nl >= providerMin && nl <= providerMax && np !== nl && !prevSet.has(nl)) {
                qtys[qtys.length - 2] = np;
                qtys[qtys.length - 1] = nl;
                break;
              }
            }
          }
        }

        // Generate randomized timestamps within [startMs, endMs]
        const spanMs = Math.max(1, endMs - startMs);
        const slots: number[] = [];
        for (let i = 0; i < qtys.length; i++) {
          // base position evenly spaced, then ±40% jitter
          const baseT = startMs + ((i + 0.5) * spanMs) / qtys.length;
          const slot = spanMs / qtys.length;
          const jitter = (Math.random() - 0.5) * slot * 0.8;
          slots.push(Math.max(startMs, Math.min(endMs, baseT + jitter)));
        }
        slots.sort((a, b) => a - b);
        // Ensure at least 60s gap between consecutive
        for (let i = 1; i < slots.length; i++) {
          if (slots[i] - slots[i - 1] < 60_000) slots[i] = slots[i - 1] + 60_000;
        }

        // Delete old pending runs
        const pendingIds = pending.map((p: any) => p.id);
        const { error: delErr } = await supabase
          .from("organic_run_schedule")
          .delete()
          .in("id", pendingIds);
        if (delErr) {
          details.push({ item_id: item.id, error: delErr.message });
          continue;
        }
        totalDeleted += pendingIds.length;

        // Determine starting run_number based on remaining (non-pending) runs
        const existingNonPending = (runs || []).filter((r: any) => r.status !== "pending").length;
        const entries = qtys.map((q, i) => ({
          engagement_order_item_id: item.id,
          run_number: existingNonPending + i + 1,
          scheduled_at: new Date(slots[i]).toISOString(),
          quantity_to_send: q,
          base_quantity: q,
          status: "pending" as const,
        }));

        if (entries.length > 0) {
          const { error: insErr } = await supabase.from("organic_run_schedule").insert(entries);
          if (insErr) {
            details.push({ item_id: item.id, error: insErr.message });
            continue;
          }
          totalNewRuns += entries.length;
          totalItems += 1;
          details.push({
            order_id: ord.id,
            item_id: item.id,
            type: item.engagement_type,
            remaining,
            provider_min: providerMin,
            new_runs: entries.length,
            sample_qtys: qtys.slice(0, 5),
          });
        }
      }
    }
    console.log(JSON.stringify({
      done: true,
      orders_scanned: orders?.length || 0,
      items_rescheduled: totalItems,
      runs_deleted: totalDeleted,
      runs_created: totalNewRuns,
    }));
  };

  // @ts-ignore EdgeRuntime global
  EdgeRuntime.waitUntil(work().catch((e) => console.error("reschedule fatal:", e)));

  return new Response(
    JSON.stringify({ ok: true, started: true, message: "Rescheduling in background" }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});

