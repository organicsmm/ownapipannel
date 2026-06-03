import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Lightweight organic scheduling parameters
// minBatch/maxBatch = random per-run quantity range (organic drip)
const CONFIG: Record<string, { baseInterval: number; intervalVariance: number; runsPerThousand: number; minRuns: number; maxRuns: number; batchCap: number; minBatch: number; maxBatch: number }> = {
  views:       { baseInterval: 45,  intervalVariance: 25, runsPerThousand: 20,   minRuns: 12, maxRuns: 5000, batchCap: 400, minBatch: 100, maxBatch: 400 },
  likes:       { baseInterval: 80,  intervalVariance: 40, runsPerThousand: 150,  minRuns: 8,  maxRuns: 2000, batchCap: 40,  minBatch: 10,  maxBatch: 40  },
  comments:    { baseInterval: 140, intervalVariance: 70, runsPerThousand: 200,  minRuns: 6,  maxRuns: 500,  batchCap: 5,   minBatch: 1,   maxBatch: 5   },
  shares:      { baseInterval: 100, intervalVariance: 50, runsPerThousand: 180,  minRuns: 5,  maxRuns: 1000, batchCap: 25,  minBatch: 5,   maxBatch: 25  },
  saves:       { baseInterval: 110, intervalVariance: 55, runsPerThousand: 160,  minRuns: 5,  maxRuns: 1000, batchCap: 25,  minBatch: 5,   maxBatch: 25  },
  followers:   { baseInterval: 280, intervalVariance: 140, runsPerThousand: 80,  minRuns: 6,  maxRuns: 500,  batchCap: 10,  minBatch: 2,   maxBatch: 10  },
  subscribers: { baseInterval: 340, intervalVariance: 170, runsPerThousand: 100, minRuns: 6,  maxRuns: 500,  batchCap: 8,   minBatch: 2,   maxBatch: 8   },
  reposts:     { baseInterval: 90,  intervalVariance: 45, runsPerThousand: 120,  minRuns: 5,  maxRuns: 1000, batchCap: 30,  minBatch: 5,   maxBatch: 30  },
  retweets:    { baseInterval: 70,  intervalVariance: 35, runsPerThousand: 65,   minRuns: 6,  maxRuns: 1000, batchCap: 35,  minBatch: 5,   maxBatch: 35  },
  watch_hours: { baseInterval: 480, intervalVariance: 240, runsPerThousand: 800, minRuns: 4,  maxRuns: 200,  batchCap: 1,   minBatch: 1,   maxBatch: 1   },
  generic:     { baseInterval: 80,  intervalVariance: 40, runsPerThousand: 60,   minRuns: 4,  maxRuns: 1000, batchCap: 50,  minBatch: 10,  maxBatch: 50  },
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

    // Validate every requested item
    const resolved: Array<{ bi: any; engagement_type: string; quantity: number; price: number; time_limit_hours: number; variance_percent: number; peak_hours_enabled: boolean }> = [];
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
      resolved.push({
        bi,
        engagement_type: it.engagement_type,
        quantity: it.quantity,
        price: Number(it.price || 0),
        time_limit_hours: Math.max(0, Number(it.time_limit_hours || 0)),
        variance_percent: Math.min(50, Math.max(0, Number(it.variance_percent ?? 25))),
        peak_hours_enabled: !!it.peak_hours_enabled,
      });
    }

    const normalizedLink = link.trim();
    const requestedTypes = resolved.map((r) => r.engagement_type);
    const { data: duplicateItems } = await supabase
      .from("engagement_order_items")
      .select("engagement_type, engagement_order:engagement_orders!inner(order_number)")
      .in("engagement_type", requestedTypes)
      .neq("status", "cancelled")
      .eq("user_id", user.id)
      .eq("user_bundle_id", bundle.id)
      .eq("link", normalizedLink)
      .eq("use_user_api", true)
      .in("status", ["pending", "processing"])
      .limit(1);
    if (duplicateItems && duplicateItems.length > 0) {
      const dup: any = duplicateItems[0];
      return new Response(JSON.stringify({ error: `Same link ka ${dup.engagement_type} order already active hai: #${dup.engagement_order?.order_number}` }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
    const createdItems: Array<{ itemId: string; bi: any; quantity: number; time_limit_hours: number; variance_percent: number; peak_hours_enabled: boolean }> = [];
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
      });
    }

    for (const { itemId, bi, quantity, time_limit_hours, variance_percent, peak_hours_enabled } of createdItems) {
      const c = cfg(bi.engagement_type);
      // ALWAYS respect provider's real min_qty for the linked service —
      // sending below provider min causes the order to fail at the panel.
      const providerMin = Math.max(1, Number(bi.min_qty || 1));
      const minBatch = providerMin;
      const maxBatch = Math.max(minBatch, c.maxBatch);
      const avgBatch = (minBatch + maxBatch) / 2;
      const variance = Math.max(0, Math.min(50, variance_percent || 0)) / 100;

      let targetRuns: number;
      let intervalMinutes: number;

      if (time_limit_hours && time_limit_hours > 0) {
        // User-set delivery window
        const totalMinutes = time_limit_hours * 60;
        const ideal = Math.max(1, Math.ceil(quantity / avgBatch));
        targetRuns = Math.min(ideal, c.maxRuns, Math.max(1, Math.floor(totalMinutes / 3)));
        if (targetRuns < 1) targetRuns = 1;
        intervalMinutes = totalMinutes / targetRuns;
      } else if (is_organic_mode) {
        targetRuns = Math.max(c.minRuns, Math.min(c.maxRuns, Math.ceil(quantity / avgBatch)));
        if (targetRuns < 1) targetRuns = 1;
        intervalMinutes = c.baseInterval;
      } else {
        targetRuns = Math.max(1, Math.ceil(quantity / maxBatch));
        intervalMinutes = c.baseInterval;
      }

      const entries: any[] = [];
      let remaining = quantity;
      let currentTime = new Date(startTime.getTime() + (3 + Math.random() * 7) * 60 * 1000);
      for (let i = 1; i <= targetRuns && remaining > 0; i++) {
        const runsLeft = targetRuns - i + 1;
        // Random batch in [minBatch, maxBatch] — true organic drip
        let qty: number;
        if (i === targetRuns || remaining <= maxBatch) {
          qty = remaining;
        } else {
          const minNeededAfter = (runsLeft - 1) * minBatch;
          const maxAllowedNow = Math.min(maxBatch, Math.max(minBatch, remaining - minNeededAfter));
          qty = Math.floor(minBatch + Math.random() * (maxAllowedNow - minBatch + 1));
          if (remaining - qty > 0 && remaining - qty < minBatch) {
            qty = Math.min(maxBatch, Math.max(minBatch, remaining - minBatch));
          }
        }

        // Peak hours: bias toward 6-11pm IST
        let scheduled = new Date(currentTime);
        if (peak_hours_enabled) {
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
        remaining -= qty;
        if (remaining <= 0) break;
        const intervalJitter = variance > 0 ? (1 - variance) + Math.random() * (2 * variance) : (1 + (Math.random() * 0.4 - 0.2));
        currentTime = new Date(currentTime.getTime() + Math.max(3, intervalMinutes * intervalJitter) * 60 * 1000);
      }
      if (remaining > 0 && entries.length > 0) {
        entries[entries.length - 1].quantity_to_send += remaining;
        entries[entries.length - 1].base_quantity += remaining;
      }

      for (let idx = entries.length - 1; idx > 0; idx--) {
        if (entries[idx].quantity_to_send > 0 && entries[idx].quantity_to_send < minBatch) {
          const deficit = minBatch - entries[idx].quantity_to_send;
          const prev = entries[idx - 1];
          if (prev.quantity_to_send - deficit >= minBatch) {
            prev.quantity_to_send -= deficit;
            prev.base_quantity -= deficit;
            entries[idx].quantity_to_send += deficit;
            entries[idx].base_quantity += deficit;
          } else if (prev.quantity_to_send + entries[idx].quantity_to_send <= maxBatch) {
            prev.quantity_to_send += entries[idx].quantity_to_send;
            prev.base_quantity += entries[idx].base_quantity;
            entries.splice(idx, 1);
          }
        }
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
