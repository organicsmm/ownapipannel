import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { orderData, totalPrice: clientTotalPrice, runs } = body;

    if (!orderData || !clientTotalPrice || clientTotalPrice <= 0) {
      return new Response(JSON.stringify({ error: "Invalid order data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Server-side price recompute using category_pricing (source of truth) ──
    let totalPrice = clientTotalPrice;
    try {
      if (orderData.service_id && orderData.quantity) {
        const { data: svc } = await supabaseAdmin
          .from("services")
          .select("category, price")
          .eq("id", orderData.service_id)
          .single();
        if (svc) {
          const { data: cp } = await supabaseAdmin
            .from("category_pricing")
            .select("price_per_1k")
            .eq("category", svc.category)
            .maybeSingle();
          const effectivePer1k = cp && Number(cp.price_per_1k) > 0
            ? Number(cp.price_per_1k)
            : Number(svc.price);
          totalPrice = (Number(orderData.quantity) / 1000) * effectivePer1k;
          orderData.price = totalPrice;
        }
      }
    } catch (e) {
      console.error("Price recompute failed, using client price:", e);
    }

    // 1. Get wallet and check balance
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from("wallets")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (walletError || !wallet) {
      return new Response(JSON.stringify({ error: "Wallet not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (wallet.balance < totalPrice) {
      return new Response(JSON.stringify({ error: "Insufficient balance" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { service_name, ...orderInsertData } = orderData;

    // 2. Create order
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        ...orderInsertData,
        user_id: user.id,
      })
      .select()
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: `Failed to create order: ${orderError?.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Deduct from wallet
    const newBalance = wallet.balance - totalPrice;
    const newSpent = (wallet.total_spent || 0) + totalPrice;
    
    const { error: updateErr } = await supabaseAdmin
      .from("wallets")
      .update({
        balance: newBalance,
        total_spent: newSpent,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (updateErr) throw updateErr;

    // 4. Record transaction
    const { error: txErr } = await supabaseAdmin.from("transactions").insert({
      user_id: user.id,
      type: "order_payment",
      amount: totalPrice,
      balance_after: newBalance,
      order_id: order.id,
      description: `Order #${order.order_number} - ${service_name || 'Service Order'}`,
      status: "completed",
    });

    if (txErr) console.error("Transaction insert error:", txErr);

    // 5. Insert organic run schedule if provided
    if (runs && runs.length > 0) {
      const runEntries = runs.map((run: any) => ({
        ...run,
        order_id: order.id,
      }));
      
      const { error: runErr } = await supabaseAdmin
        .from("organic_run_schedule")
        .insert(runEntries);
        
      if (runErr) console.error("Run schedule insert error:", runErr);
    }

    // 6. Trigger process-order for non-organic orders
    if (!orderInsertData.is_organic_mode) {
      try {
        await supabaseAdmin.functions.invoke("process-order", {
          body: { order_id: order.id },
        });
      } catch (e) {
        console.error("Failed to trigger process-order:", e);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      order_id: order.id,
      order_number: order.order_number,
      new_balance: newBalance,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("place-order error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
