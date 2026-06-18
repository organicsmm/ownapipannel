import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Lightweight organic scheduling parameters
// minBatch/maxBatch = random per-run quantity range (organic drip)
const CONFIG: Record<string, { baseInterval: number; intervalVariance: number; runsPerThousand: number; minRuns: number; maxRuns: number; batchCap: number; minBatch: number; maxBatch: number }> = {
  views:       { baseInterval: 45,  intervalVariance: 25, runsPerThousand: 20,   minRuns: 12, maxRuns: 5000, batchCap: 400,  minBatch: 100, maxBatch: 400  },
  likes:       { baseInterval: 80,  intervalVariance: 40, runsPerThousand: 20,   minRuns: 8,  maxRuns: 2000, batchCap: 500,  minBatch: 10,  maxBatch: 500  },
  comments:    { baseInterval: 140, intervalVariance: 70, runsPerThousand: 50,   minRuns: 6,  maxRuns: 500,  batchCap: 50,   minBatch: 10,  maxBatch: 50   },
  shares:      { baseInterval: 100, intervalVariance: 50, runsPerThousand: 25,   minRuns: 5,  maxRuns: 1000, batchCap: 300,  minBatch: 10,  maxBatch: 300  },
  saves:       { baseInterval: 110, intervalVariance: 55, runsPerThousand: 25,   minRuns: 5,  maxRuns: 1000, batchCap: 300,  minBatch: 10,  maxBatch: 300  },
  followers:   { baseInterval: 280, intervalVariance: 140, runsPerThousand: 30,  minRuns: 6,  maxRuns: 500,  batchCap: 200,  minBatch: 10,  maxBatch: 200  },
  subscribers: { baseInterval: 340, intervalVariance: 170, runsPerThousand: 40,  minRuns: 6,  maxRuns: 500,  batchCap: 150,  minBatch: 10,  maxBatch: 150  },
  reposts:     { baseInterval: 90,  intervalVariance: 45, runsPerThousand: 25,   minRuns: 5,  maxRuns: 1000, batchCap: 300,  minBatch: 10,  maxBatch: 300  },
  retweets:    { baseInterval: 70,  intervalVariance: 35, runsPerThousand: 20,   minRuns: 6,  maxRuns: 1000, batchCap: 350,  minBatch: 10,  maxBatch: 350  },
  watch_hours: { baseInterval: 480, intervalVariance: 240, runsPerThousand: 200, minRuns: 4,  maxRuns: 200,  batchCap: 10,   minBatch: 1,   maxBatch: 10   },
  generic:     { baseInterval: 80,  intervalVariance: 40, runsPerThousand: 20,   minRuns: 4,  maxRuns: 1000, batchCap: 500,  minBatch: 50,  maxBatch: 500  },
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
      items: Array<{
        user_bundle_item_id: string;
        engagement_type: string;
        quantity: number;
        price: number;
        time_limit_hours?: number;       // 0 = Auto
        variance_percent?: number;        // 10-50
        peak_hours_enabled?: boolean;
        runs_override?: number;           // 0 = Auto, >0 = user-chosen runs
      }>;
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

    const requestedBundleItemIds = items.map((it) => it.user_bundle_item_id).filter(Boolean);
    const providerLimitsByItem = new Map<string, { min: number; max: number }>();
    for (const id of requestedBundleItemIds) {
      const bi = itemMap.get(id);
      if (bi) providerLimitsByItem.set(id, {
        min: Math.max(1, Number(bi.min_qty || 0) || 10),
        max: Number(bi.max_qty || 0) > 0 ? Number(bi.max_qty) : Number.MAX_SAFE_INTEGER,
      });
    }
    const { data: rotationRows } = requestedBundleItemIds.length > 0 ? await supabase
      .from("user_bundle_item_providers")
      .select("user_bundle_item_id, user_provider_account_id, provider_service_id")
      .in("user_bundle_item_id", requestedBundleItemIds)
      .eq("is_active", true) : { data: [] as any };
    const rotationProviderIds = [...new Set((rotationRows || []).map((r: any) => r.user_provider_account_id).filter(Boolean))];
    const rotationServiceIds = [...new Set((rotationRows || []).map((r: any) => String(r.provider_service_id)).filter(Boolean))];
    if (rotationProviderIds.length > 0 && rotationServiceIds.length > 0) {
      const { data: serviceLimits } = await supabase
        .from("user_services")
        .select("user_provider_account_id, provider_service_id, min_quantity, max_quantity")
        .in("user_provider_account_id", rotationProviderIds)
        .in("provider_service_id", rotationServiceIds);
      const serviceLimitMap = new Map<string, any>();
      for (const svc of (serviceLimits || [])) serviceLimitMap.set(`${svc.user_provider_account_id}|${svc.provider_service_id}`, svc);
      for (const row of (rotationRows || [])) {
        const svc = serviceLimitMap.get(`${row.user_provider_account_id}|${row.provider_service_id}`);
        if (!svc) continue;
        const current = providerLimitsByItem.get(row.user_bundle_item_id);
        const svcMin = Math.max(1, Number(svc.min_quantity || 0) || 10);
        const svcMax = Number(svc.max_quantity || 0) > 0 ? Number(svc.max_quantity) : Number.MAX_SAFE_INTEGER;
        providerLimitsByItem.set(row.user_bundle_item_id, {
          min: current ? Math.min(current.min, svcMin) : svcMin,
          max: current ? Math.max(current.max, svcMax) : svcMax,
        });
      }
    }

    // Validate every requested item
    const resolved: Array<{ bi: any; engagement_type: string; quantity: number; price: number; time_limit_hours: number; variance_percent: number; peak_hours_enabled: boolean; runs_override: number; provider_min_qty: number; provider_max_qty: number }> = [];
    for (const it of items) {
      const bi = itemMap.get(it.user_bundle_item_id);
      if (!bi) return new Response(JSON.stringify({ error: `Bundle item ${it.user_bundle_item_id} not found` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (!bi.user_provider_account_id || !bi.user_provider_accounts) {
        return new Response(JSON.stringify({ error: `Item "${bi.engagement_type}" has no linked provider` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (!bi.provider_service_id) {
        return new Response(JSON.stringify({ error: `Item "${bi.engagement_type}" has no provider service ID` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const itemLimits = providerLimitsByItem.get(bi.id);
      const minQ = Number(itemLimits?.min || bi.min_qty || 0);
      const maxQ = Number(itemLimits?.max && itemLimits.max < Number.MAX_SAFE_INTEGER ? itemLimits.max : bi.max_qty || 0);
      if (minQ > 0 && it.quantity < minQ) {
        return new Response(JSON.stringify({ error: `${bi.engagement_type} below provider min ${minQ}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (maxQ > 0 && it.quantity > maxQ) {
        return new Response(JSON.stringify({ error: `${bi.engagement_type} above provider max ${maxQ}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      resolved.push({
        bi,
        engagement_type: it.engagement_type,
        quantity: it.quantity,
        price: Number(it.price || 0),
        time_limit_hours: Math.max(0, Number(it.time_limit_hours || 0)),
        variance_percent: Math.min(50, Math.max(0, Number(it.variance_percent ?? 25))),
        peak_hours_enabled: !!it.peak_hours_enabled,
        provider_min_qty: Math.max(1, minQ || 10),
        provider_max_qty: maxQ > 0 ? maxQ : Number.MAX_SAFE_INTEGER,
      });
    }

    const normalizedLink = link.trim();
    const requestedTypes = resolved.map((r) => r.engagement_type);
    const { data: activeOrders } = await supabase
      .from("engagement_orders")
      .select("id, order_number")
      .eq("user_id", user.id)
      .eq("user_bundle_id", bundle.id)
      .eq("link", normalizedLink)
      .eq("use_user_api", true)
      .in("status", ["pending", "processing"]);
    const activeOrderIds = (activeOrders || []).map((o: any) => o.id);
    const { data: duplicateItems } = activeOrderIds.length > 0 ? await supabase
      .from("engagement_order_items")
      .select("engagement_type, engagement_order_id")
      .in("engagement_order_id", activeOrderIds)
      .in("engagement_type", requestedTypes)
      .neq("status", "cancelled")
      .limit(1) : { data: [] } as any;
    if (duplicateItems && duplicateItems.length > 0) {
      const dup: any = duplicateItems[0];
      const dupOrder = (activeOrders || []).find((o: any) => o.id === dup.engagement_order_id);
      return new Response(JSON.stringify({ error: `Same link ka ${dup.engagement_type} order already active hai: #${dupOrder?.order_number}` }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const total_price = resolved.reduce((s, r) => s + r.price, 0);
    // Primary provider — for the engagement_orders.user_provider_account_id stamp
    const primaryProviderId = resolved[0].bi.user_provider_account_id;

    // Create engagement order (use_user_api flag prevents admin executor from touching it)
    const { data: order, error: orderErr } = await supabase
      .from("engagement_orders")
      .insert({
        user_id: user.id,
        link: normalizedLink,
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
    const createdItems: Array<{ itemId: string; bi: any; quantity: number; time_limit_hours: number; variance_percent: number; peak_hours_enabled: boolean; provider_min_qty: number; provider_max_qty: number }> = [];
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
        await supabase.from("engagement_orders").update({ status: "cancelled", error_message: itemErr?.message || "Failed to create order item" }).eq("id", order.id);
        return new Response(JSON.stringify({ error: itemErr?.message || "Failed to create order item" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      createdItems.push({
        itemId: item.id,
        bi: r.bi,
        quantity: r.quantity,
        time_limit_hours: r.time_limit_hours,
        variance_percent: r.variance_percent,
        peak_hours_enabled: r.peak_hours_enabled,
          provider_min_qty: r.provider_min_qty,
          provider_max_qty: r.provider_max_qty,
      });
    }

    // Organic start-offset per engagement type so views fire first, then others slowly join.
    const TYPE_START_DELAY_MIN: Record<string, [number, number]> = {
      views:       [0, 2],
      likes:       [6, 14],
      saves:       [12, 22],
      shares:      [10, 20],
      reposts:     [9, 18],
      retweets:    [8, 16],
      comments:    [16, 28],
      followers:   [10, 20],
      subscribers: [12, 22],
      watch_hours: [4, 10],
      generic:     [5, 12],
    };

    // helper: random int in [lo, hi]
    const ri = (lo: number, hi: number) => Math.floor(lo + Math.random() * (hi - lo + 1));
    // Organic distributor: ALWAYS splits `total` into ~desiredRuns chunks while
    // respecting [min, max] per chunk. Auto-expands `max` when needed so a big
    // total never collapses into a single huge run (the previous algorithm did
    // exactly that — e.g. 80,000 views with max=400 fell back to [80000]).
    const buildUniqueQuantities = (total: number, min: number, max: number, desiredRuns: number): number[] => {
      if (total <= 0) return [];
      if (total < Math.max(1, min) || desiredRuns <= 1) return [total];

      // How many chunks can we realistically make, given provider min?
      const cap = Math.max(1, Math.min(desiredRuns, Math.floor(total / Math.max(1, min)), 5000));
      let n = cap;

      // Expand the per-chunk ceiling so it can actually hold `total` across n runs.
      // Need: n * effMax >= total  →  effMax >= ceil(total / n) * organic_buffer
      const needed = Math.ceil(total / n);
      const effMax = Math.max(max, Math.ceil(needed * 1.8), min + 1);
      // Effective floor: don't drop below provider min, but also don't be larger
      // than the per-chunk average (otherwise every chunk = min and we can't reach total).
      const effMin = Math.max(min, Math.min(effMax - 1, Math.floor(needed * 0.35)));

      // 1) Seed each run with random weight, then normalize to total.
      const weights: number[] = [];
      for (let i = 0; i < n; i++) {
        // Organic-looking weight: log-normalish via (0.55..1.45)
        weights.push(0.55 + Math.random() * 0.9);
      }
      const wSum = weights.reduce((a, b) => a + b, 0);
      let qtys = weights.map((w) => Math.round((w / wSum) * total));

      // 2) Clamp into [effMin, effMax]
      qtys = qtys.map((q) => Math.max(effMin, Math.min(effMax, q)));

      // 3) Fix rounding/clamp drift by random walk add/sub across runs.
      let drift = total - qtys.reduce((a, b) => a + b, 0);
      let guard = 0;
      while (drift !== 0 && guard++ < 20000) {
        const idx = Math.floor(Math.random() * qtys.length);
        if (drift > 0) {
          const room = effMax - qtys[idx];
          if (room <= 0) continue;
          const step = Math.max(1, Math.min(room, drift, Math.ceil(Math.abs(drift) / Math.max(1, qtys.length))));
          qtys[idx] += step;
          drift -= step;
        } else {
          const room = qtys[idx] - effMin;
          if (room <= 0) continue;
          const step = Math.max(1, Math.min(room, -drift, Math.ceil(Math.abs(drift) / Math.max(1, qtys.length))));
          qtys[idx] -= step;
          drift += step;
        }
      }

      // 4) If we still have drift (rare), absorb into the largest-room run; never violate provider min.
      if (drift !== 0) {
        if (drift > 0) {
          // give it to the run with most headroom
          let best = 0;
          for (let i = 1; i < qtys.length; i++) if (qtys[i] < qtys[best]) best = i;
          qtys[best] += drift;
        } else {
          // remove from the largest run, but never go below `min`
          let best = 0;
          for (let i = 1; i < qtys.length; i++) if (qtys[i] > qtys[best]) best = i;
          qtys[best] = Math.max(min, qtys[best] + drift);
        }
      }

      // 5) Avoid identical neighbours (organic = not duplicate-looking).
      for (let i = 1; i < qtys.length; i++) {
        if (qtys[i] === qtys[i - 1]) {
          const swap = (i + 2) % qtys.length;
          if (swap !== i) { const t = qtys[i]; qtys[i] = qtys[swap]; qtys[swap] = t; }
        }
      }

      // 6) Shuffle so order isn't ascending/descending.
      for (let i = qtys.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = qtys[i]; qtys[i] = qtys[j]; qtys[j] = t;
      }

      return qtys;
    };
    // helper: turn round numbers into organic ones (e.g. 150 -> 147 / 152 / 161, never trailing zero)
    const organicize = (n: number, min: number, max: number) => {
      if (n <= min) return Math.max(min, n);
      // ±9% jitter
      const jitter = Math.round(n * (Math.random() * 0.18 - 0.09));
      let v = n + jitter;
      // if rounded to multiple of 10, nudge to non-round
      if (v % 10 === 0) v += ri(1, 9) * (Math.random() < 0.5 ? -1 : 1);
      if (v < min) v = min + ri(0, 4);
      if (v > max) v = max - ri(0, 4);
      return Math.max(1, v);
    };

    for (const { itemId, bi, quantity, time_limit_hours, variance_percent, peak_hours_enabled, provider_min_qty, provider_max_qty } of createdItems) {
      const c = cfg(bi.engagement_type);
      const isViews = String(bi.engagement_type).toLowerCase() === "views";
      const providerMin = Math.max(isViews ? 100 : 10, Number(provider_min_qty || bi.min_qty || 1));
      const providerMax = Number(provider_max_qty || bi.max_qty || 0) > 0 ? Number(provider_max_qty || bi.max_qty) : Number.MAX_SAFE_INTEGER;
      const variance = Math.max(0, Math.min(50, variance_percent || 25)) / 100;
      const MIN_INTERVAL = 3; // minutes

      const baseMaxBatch = Math.max(providerMin, Math.min(providerMax, c.maxBatch));
      let effectiveMaxBatch = baseMaxBatch;
      let effectiveMinBatch = Math.min(baseMaxBatch, Math.max(providerMin, c.minBatch || providerMin));
      let targetRuns: number;
      let intervalMinutes: number;

      if (time_limit_hours && time_limit_hours > 0) {
        const totalMinutes = time_limit_hours * 60;
        const runsAtBaseBatch = Math.ceil(quantity / baseMaxBatch);
        // How many runs are actually possible without going below provider minimum
        const maxSplitByMin = Math.max(1, Math.floor(quantity / Math.max(1, providerMin)));
        const maxRunsByTime = Math.max(1, Math.floor(totalMinutes / MIN_INTERVAL));
        const idealRuns = Math.max(1, Math.floor(totalMinutes / Math.max(MIN_INTERVAL, c.baseInterval / 2)));
        // Always try to split into at least 2 runs if quantity allows it, so the
        // chosen timeframe actually spreads delivery — never dump everything instantly.
        const desired = Math.min(
          maxSplitByMin,
          maxRunsByTime,
          Math.max(runsAtBaseBatch, Math.min(idealRuns, c.maxRuns))
        );
        if (runsAtBaseBatch <= idealRuns && maxSplitByMin >= 2) {
          targetRuns = Math.max(2, Math.max(c.minRuns, Math.min(c.maxRuns, desired)));
        } else if (runsAtBaseBatch <= idealRuns) {
          // qty too small to split → single run, but we'll schedule it inside the window below
          targetRuns = 1;
        } else {
          targetRuns = Math.min(c.maxRuns, Math.max(c.minRuns, Math.min(maxRunsByTime, maxSplitByMin)));
          const avgRequired = quantity / targetRuns;
          effectiveMaxBatch = Math.min(providerMax, Math.max(baseMaxBatch, Math.ceil(avgRequired * 1.4)));
          effectiveMinBatch = Math.max(providerMin, Math.min(effectiveMaxBatch, Math.floor(avgRequired * 0.6)));
        }
        intervalMinutes = Math.max(MIN_INTERVAL, totalMinutes / Math.max(1, targetRuns));

      } else if (is_organic_mode) {
        const runsAtBaseBatch = Math.ceil(quantity / baseMaxBatch);
        if (runsAtBaseBatch <= c.maxRuns) {
          targetRuns = Math.max(c.minRuns, Math.min(c.maxRuns, runsAtBaseBatch));
        } else {
          targetRuns = c.maxRuns;
          const avgRequired = quantity / targetRuns;
          effectiveMaxBatch = Math.min(providerMax, Math.max(baseMaxBatch, Math.ceil(avgRequired * 1.4)));
          effectiveMinBatch = Math.max(providerMin, Math.min(effectiveMaxBatch, Math.floor(avgRequired * 0.6)));
        }
        intervalMinutes = c.baseInterval;
      } else {
        targetRuns = Math.max(1, Math.ceil(quantity / baseMaxBatch));
        intervalMinutes = c.baseInterval;
      }

      // Ensure we have enough runs to actually fit `quantity` within providerMax.
      const minRunsForProviderMax = Math.max(1, Math.ceil(quantity / Math.max(1, providerMax)));
      if (targetRuns < minRunsForProviderMax) targetRuns = minRunsForProviderMax;

      const safetyAvg = quantity / Math.max(1, targetRuns);
      // Per-run ceiling must always be able to hold the average chunk + jitter.
      // Cap at providerMax so we never ask the provider for more than it allows.
      const requiredMax = Math.ceil(safetyAvg * 1.6);
      if (requiredMax > effectiveMaxBatch) {
        effectiveMaxBatch = Math.min(providerMax, Math.max(effectiveMaxBatch, requiredMax));
      }
      // If providerMax is the bottleneck, add runs until n * providerMax >= quantity.
      if (effectiveMaxBatch * targetRuns < quantity) {
        targetRuns = Math.max(targetRuns, Math.ceil(quantity / Math.max(1, effectiveMaxBatch)));
      }
      effectiveMinBatch = Math.max(providerMin, Math.min(effectiveMaxBatch, Math.floor(safetyAvg * 0.5)));
      if (effectiveMinBatch > effectiveMaxBatch) effectiveMinBatch = effectiveMaxBatch;

      const minBatch = Math.max(providerMin, effectiveMinBatch);
      const maxBatch = effectiveMaxBatch;

      // Per-type start offset: views first, others delayed.
      // When user picked a custom timeframe, use a real fraction of the window
      // instead of 0-2 min so delivery actually spreads — not instant.
      const delayRange = TYPE_START_DELAY_MIN[bi.engagement_type] || TYPE_START_DELAY_MIN.generic;
      let typeStartOffsetMin = ri(delayRange[0], delayRange[1]) + Math.random();
      if (time_limit_hours && time_limit_hours > 0) {
        const totalMinutes = time_limit_hours * 60;
        if (targetRuns <= 1) {
          // Single run → schedule it at a random point inside the user's window
          // (between 20% and 80% of the window) so it isn't an instant dump.
          typeStartOffsetMin = totalMinutes * (0.2 + Math.random() * 0.6);
        } else {
          // Multiple runs → small random jitter (max 1 interval) so cadence stays organic
          typeStartOffsetMin = Math.random() * intervalMinutes * 0.6;
        }
      }

      const entries: any[] = [];
      let remaining = quantity;
      let currentTime = new Date(startTime.getTime() + typeStartOffsetMin * 60 * 1000);
      const qtyPlan = buildUniqueQuantities(quantity, minBatch, maxBatch, targetRuns);


      // Track used quantities so no two runs share the same number per engagement type
      const usedQtys = new Set<number>();

      for (let i = 1; i <= qtyPlan.length && remaining > 0; i++) {
        let qty = qtyPlan[i - 1];
        if (qty < 1) qty = 1;
        if (qty > remaining) qty = remaining;

        let scheduled = new Date(currentTime);
        if (peak_hours_enabled && !(time_limit_hours && time_limit_hours > 0)) {
          const istHour = (scheduled.getUTCHours() + 5 + Math.floor((scheduled.getUTCMinutes() + 30) / 60)) % 24;
          if (istHour < 18 || istHour > 23) {
            const targetHourIST = 18 + Math.floor(Math.random() * 6);
            const deltaHours = ((targetHourIST - istHour) + 24) % 24;
            if (deltaHours <= 6) scheduled = new Date(scheduled.getTime() + deltaHours * 60 * 60 * 1000);
          }
        }

        entries.push({
          engagement_order_item_id: itemId,
          run_number: i,
          scheduled_at: scheduled.toISOString(),
          quantity_to_send: qty,
          base_quantity: qty,
          status: "pending",
        });
        usedQtys.add(qty);
        remaining -= qty;
        if (remaining <= 0) break;
        // Strong random spacing — true organic, never fixed cadence
        const vlow = Math.max(0.4, 1 - Math.max(variance, 0.35));
        const vhigh = 1 + Math.max(variance, 0.4);
        const intervalJitter = vlow + Math.random() * (vhigh - vlow);
        const pauseBoost = Math.random() < 0.12 ? 1.5 + Math.random() * 1.5 : 1;
        // Add per-run second-level jitter so two runs never align to the same minute
        const secondJitter = Math.floor(Math.random() * 59);
        currentTime = new Date(
          currentTime.getTime()
          + Math.max(MIN_INTERVAL, intervalMinutes * intervalJitter * pauseBoost) * 60 * 1000
          + secondJitter * 1000
        );
      }
      // Safety net: spread any leftover
      while (remaining > 0 && entries.length < 5000) {
        const qty = Math.min(remaining, maxBatch);
        entries.push({
          engagement_order_item_id: itemId,
          run_number: entries.length + 1,
          scheduled_at: new Date(currentTime).toISOString(),
          quantity_to_send: qty,
          base_quantity: qty,
          status: "pending",
        });
        remaining -= qty;
        currentTime = new Date(currentTime.getTime() + Math.max(MIN_INTERVAL, intervalMinutes) * 60 * 1000);
      }
      entries.forEach((entry, idx) => { entry.run_number = idx + 1; });


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
