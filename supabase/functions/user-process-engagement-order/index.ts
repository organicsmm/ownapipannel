import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Lightweight organic scheduling parameters
const CONFIG: Record<string, { baseInterval: number; intervalVariance: number; runsPerThousand: number; minRuns: number; maxRuns: number; batchCap: number }> = {
  views:       { baseInterval: 45,  intervalVariance: 25, runsPerThousand: 20,   minRuns: 12, maxRuns: 200, batchCap: 200 },
  likes:       { baseInterval: 80,  intervalVariance: 40, runsPerThousand: 150,  minRuns: 8,  maxRuns: 150, batchCap: 40  },
  comments:    { baseInterval: 140, intervalVariance: 70, runsPerThousand: 200,  minRuns: 6,  maxRuns: 100, batchCap: 5   },
  shares:      { baseInterval: 100, intervalVariance: 50, runsPerThousand: 180,  minRuns: 5,  maxRuns: 80,  batchCap: 25  },
  saves:       { baseInterval: 110, intervalVariance: 55, runsPerThousand: 160,  minRuns: 5,  maxRuns: 80,  batchCap: 25  },
  followers:   { baseInterval: 280, intervalVariance: 140, runsPerThousand: 80,  minRuns: 6,  maxRuns: 80,  batchCap: 10  },
  subscribers: { baseInterval: 340, intervalVariance: 170, runsPerThousand: 100, minRuns: 6,  maxRuns: 80,  batchCap: 8   },
  reposts:     { baseInterval: 90,  intervalVariance: 45, runsPerThousand: 120,  minRuns: 5,  maxRuns: 80,  batchCap: 30  },
  retweets:    { baseInterval: 70,  intervalVariance: 35, runsPerThousand: 65,   minRuns: 6,  maxRuns: 80,  batchCap: 35  },
  watch_hours: { baseInterval: 480, intervalVariance: 240, runsPerThousand: 800, minRuns: 4,  maxRuns: 40,  batchCap: 1   },
  generic:     { baseInterval: 80,  intervalVariance: 40, runsPerThousand: 60,   minRuns: 4,  maxRuns: 100, batchCap: 50  },
};

const cfg = (t: string) => CONFIG[t] || CONFIG.generic;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { user_bundle_id, link, base_quantity, items, is_organic_mode = true } = body as {
      user_bundle_id: string; link: string; base_quantity: number;
      items: Array<{ user_bundle_item_id: string; engagement_type: string; quantity: number; price: number }>;
      is_organic_mode?: boolean;
    };

    if (!user_bundle_id || !link?.trim() || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Load bundle + items + provider accounts (owned by user)
    const { data: bundle, error: bundleErr } = await supabase
      .from("user_bundles")
      .select("*, user_bundle_items(*, user_provider_accounts(id, name, api_url, api_key, is_active))")
      .eq("id", user_bundle_id)
      .eq("user_id", user.id)
      .single();
    if (bundleErr || !bundle) {
      return new Response(JSON.stringify({ error: "Bundle not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const itemMap = new Map<string, any>();
    for (const bi of (bundle.user_bundle_items || [])) itemMap.set(bi.id, bi);

    // Validate every requested item
    const resolved: Array<{ bi: any; engagement_type: string; quantity: number; price: number }> = [];
    for (const it of items) {
      const bi = itemMap.get(it.user_bundle_item_id);
      if (!bi) return new Response(JSON.stringify({ error: `Bundle item ${it.user_bundle_item_id} not found` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (!bi.user_provider_account_id || !bi.user_provider_accounts) {
        return new Response(JSON.stringify({ error: `Item "${bi.engagement_type}" has no linked provider` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (!bi.provider_service_id) {
        return new Response(JSON.stringify({ error: `Item "${bi.engagement_type}" has no provider service ID` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const minQ = Number(bi.min_qty || 0);
      const maxQ = Number(bi.max_qty || 0);
      if (minQ > 0 && it.quantity < minQ) {
        return new Response(JSON.stringify({ error: `${bi.engagement_type} below provider min ${minQ}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (maxQ > 0 && it.quantity > maxQ) {
        return new Response(JSON.stringify({ error: `${bi.engagement_type} above provider max ${maxQ}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      resolved.push({ bi, engagement_type: it.engagement_type, quantity: it.quantity, price: Number(it.price || 0) });
    }

    const total_price = resolved.reduce((s, r) => s + r.price, 0);
    // Primary provider — for the engagement_orders.user_provider_account_id stamp
    const primaryProviderId = resolved[0].bi.user_provider_account_id;

    // Create engagement order (use_user_api flag prevents admin executor from touching it)
    const { data: order, error: orderErr } = await supabase
      .from("engagement_orders")
      .insert({
        user_id: user.id,
        link: link.trim(),
        base_quantity,
        total_price,
        is_organic_mode,
        status: "processing",
        use_user_api: true,
        user_bundle_id: bundle.id,
        user_provider_account_id: primaryProviderId,
      })
      .select()
      .single();
    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: orderErr?.message || "Failed to create order" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create items + schedule runs
    const startTime = new Date();
    const createdItems: Array<{ itemId: string; bi: any; quantity: number }> = [];
    for (const r of resolved) {
      const { data: item, error: itemErr } = await supabase
        .from("engagement_order_items")
        .insert({
          engagement_order_id: order.id,
          engagement_type: r.engagement_type,
          quantity: r.quantity,
          price: r.price,
          status: "pending",
          service_id: null,
        })
        .select()
        .single();
      if (itemErr || !item) {
        console.error("Failed to create item:", itemErr);
        continue;
      }
      createdItems.push({ itemId: item.id, bi: r.bi, quantity: r.quantity });
    }

    for (const { itemId, bi, quantity } of createdItems) {
      const c = cfg(bi.engagement_type);
      const providerMin = Math.max(1, Number(bi.min_qty || 1));
      const batchCap = Math.max(c.batchCap, providerMin);

      let targetRuns: number;
      if (is_organic_mode) {
        const ideal = Math.max(c.minRuns, Math.min(c.maxRuns, Math.round((quantity / 1000) * c.runsPerThousand)));
        const maxFeasible = Math.max(1, Math.floor(quantity / providerMin));
        targetRuns = Math.min(ideal, maxFeasible);
        if (targetRuns < 1) targetRuns = 1;
      } else {
        targetRuns = Math.max(1, Math.ceil(quantity / batchCap));
      }

      // Build runs
      const entries: any[] = [];
      let remaining = quantity;
      let currentTime = new Date(startTime.getTime() + (5 + Math.random() * 10) * 60 * 1000);
      for (let i = 1; i <= targetRuns && remaining > 0; i++) {
        const runsLeft = targetRuns - i + 1;
        let qty = Math.round((remaining / runsLeft) * (0.85 + Math.random() * 0.3));
        qty = Math.max(providerMin, Math.min(qty, remaining, batchCap));
        if (i === targetRuns) qty = remaining;
        entries.push({
          engagement_order_item_id: itemId,
          run_number: i,
          scheduled_at: currentTime.toISOString(),
          quantity_to_send: qty,
          base_quantity: qty,
          status: "pending",
        });
        remaining -= qty;
        const intervalMin = c.baseInterval + (Math.random() * 2 - 1) * c.intervalVariance;
        currentTime = new Date(currentTime.getTime() + Math.max(5, intervalMin) * 60 * 1000);
      }
      // Merge any leftover into last run
      if (remaining > 0 && entries.length > 0) {
        entries[entries.length - 1].quantity_to_send += remaining;
        entries[entries.length - 1].base_quantity += remaining;
      }

      if (entries.length > 0) {
        const { error: schedErr } = await supabase.from("organic_run_schedule").insert(entries);
        if (schedErr) console.error(`Schedule insert error for item ${itemId}:`, schedErr);
      }
    }

    // Kick off executor immediately (background)
    const trigger = async () => {
      try {
        const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/execute-user-runs`;
        await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          },
          body: JSON.stringify({ instant: true, order_id: order.id }),
        });
      } catch (e) { console.error("trigger executor failed:", e); }
    };
    if (typeof (globalThis as any).EdgeRuntime?.waitUntil === "function") {
      (globalThis as any).EdgeRuntime.waitUntil(trigger());
    } else {
      trigger();
    }

    return new Response(JSON.stringify({ success: true, order_id: order.id, order_number: order.order_number }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("user-process-engagement-order error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
