import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, "0")).join("");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!razorpayKeyId || !razorpayKeySecret) {
      return new Response(JSON.stringify({ error: "Razorpay keys not configured on server" }), {
        status: 500,
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

    const { paymentId, razorpayOrderId, razorpaySignature, claimedUsdAmount, inrAmount } = await req.json();
    if (!paymentId || !String(paymentId).startsWith("pay_")) {
      return new Response(JSON.stringify({ error: "Invalid payment ID format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!razorpayOrderId || !String(razorpayOrderId).startsWith("order_")) {
      return new Response(JSON.stringify({ error: "Invalid order ID format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!razorpaySignature) {
      return new Response(JSON.stringify({ error: "Missing Razorpay signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existing } = await supabaseAdmin
      .from("transactions")
      .select("id")
      .eq("payment_reference", paymentId)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: "Payment already processed" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const signaturePayload = `${razorpayOrderId}|${paymentId}`;
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(razorpayKeySecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const computedSignature = toHex(await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(signaturePayload)));

    if (computedSignature !== razorpaySignature) {
      return new Response(JSON.stringify({ error: "Invalid Razorpay signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const auth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
    const rpResponse = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Basic ${auth}` },
    });

    if (!rpResponse.ok) {
      return new Response(JSON.stringify({ error: "Could not verify payment with Razorpay" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payment = await rpResponse.json();
    if (payment.status !== "captured") {
      return new Response(JSON.stringify({ error: `Payment status is ${payment.status}. It must be captured.` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payment.order_id !== razorpayOrderId) {
      return new Response(JSON.stringify({ error: "Razorpay order mismatch" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paidInr = Number(payment.amount || 0) / 100;
    const requestedInr = Number(inrAmount || 0);
    if (!Number.isFinite(paidInr) || paidInr < 30) {
      return new Response(JSON.stringify({ error: "Invalid paid amount returned by Razorpay" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (requestedInr > 0 && Math.abs(paidInr - requestedInr) > 1) {
      return new Response(JSON.stringify({ error: `Amount mismatch. Paid ₹${paidInr}, expected ₹${requestedInr}.` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let exchangeRate = 83.5;
    try {
      const rateRes = await supabaseAdmin.functions.invoke("get-exchange-rates");
      if (rateRes.data?.rates?.INR) exchangeRate = Number(rateRes.data.rates.INR);
    } catch (e) {
      console.error("Failed to fetch rates, using fallback 83.5", e);
    }

    const actualUsd = Number((paidInr / exchangeRate).toFixed(2));
    const claimedUsd = Number(claimedUsdAmount || 0);
    if (claimedUsd > 0 && Math.abs(actualUsd - claimedUsd) > 0.25) {
      return new Response(JSON.stringify({ error: `Wallet credit mismatch. Paid ₹${paidInr}, expected about $${claimedUsd.toFixed(2)}.` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: wallet, error: walletError } = await supabaseAdmin
      .from("wallets")
      .select("balance, total_deposited")
      .eq("user_id", user.id)
      .single();

    if (walletError || !wallet) throw walletError || new Error("Wallet not found");

    const newBalance = Number(wallet.balance || 0) + actualUsd;
    const newTotalDeposited = Number(wallet.total_deposited || 0) + actualUsd;

    const { error: updateErr } = await supabaseAdmin
      .from("wallets")
      .update({
        balance: newBalance,
        total_deposited: newTotalDeposited,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (updateErr) throw updateErr;

    const { error: txErr } = await supabaseAdmin.from("transactions").insert({
      user_id: user.id,
      type: "deposit",
      amount: actualUsd,
      balance_after: newBalance,
      status: "completed",
      payment_method: "razorpay",
      payment_reference: paymentId,
      description: `Razorpay Deposit — ₹${paidInr.toFixed(2)} via ${payment.method}`,
    });

    if (txErr) throw txErr;

    try {
      await supabaseAdmin.functions.invoke("send-telegram-notification", {
        body: {
          message:
            `<b>✅ AUTO DEPOSIT SUCCESS</b>\n\n` +
            `👤 <b>User:</b> ${user.email}\n` +
            `💰 <b>Amount:</b> $${actualUsd.toFixed(2)} (₹${paidInr.toFixed(2)})\n` +
            `💳 <b>Method:</b> ${payment.method}\n` +
            `🆔 <b>Ref:</b> <code>${paymentId}</code>`,
        },
      });
    } catch (e) {
      console.error("Failed to send telegram notification", e);
    }

    return new Response(JSON.stringify({
      success: true,
      amount: actualUsd,
      message: `Successfully credited $${actualUsd.toFixed(2)}`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("verify-razorpay-deposit error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
