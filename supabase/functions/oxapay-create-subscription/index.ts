// oxapay-create-subscription
// Creates an OxaPay invoice for the selected plan and returns the pay URL.
// Pricing is server-frozen; client cannot influence amount or order_id.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Plan = "monthly" | "yearly" | "lifetime";

// FROZEN server-side pricing. Never accept amounts from client.
// Must match public.activate_subscription_oxapay expected amounts.
const PLANS: Record<Plan, { amount: number; label: string }> = {
  monthly:  { amount: 29,  label: "Monthly Plan" },
  yearly:   { amount: 249, label: "Yearly Plan" },
  lifetime: { amount: 499, label: "Lifetime Plan" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const OXAPAY_KEY = Deno.env.get("OXAPAY_MERCHANT_API_KEY");
    if (!OXAPAY_KEY) return json({ error: "Payment provider not configured" }, 500);

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const userId = claimsData.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const plan = body?.plan as Plan;
    if (!plan || !(plan in PLANS)) return json({ error: "Invalid plan" }, 400);

    const { amount, label } = PLANS[plan];
    const admin = createClient(SUPABASE_URL, SERVICE);

    // Server-generated order id — never from client
    const orderId = `oxs_${userId.slice(0, 8)}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

    const origin = req.headers.get("origin") || req.headers.get("referer") || "https://boostbotting.site";
    const returnUrl = `${origin.replace(/\/$/, "")}/dashboard?sub=success&order_id=${orderId}`;
    const callbackUrl = `${SUPABASE_URL}/functions/v1/oxapay-webhook`;

    // Insert deposit row (pending)
    const { error: insErr } = await admin.from("oxapay_deposits").insert({
      user_id: userId,
      purpose: "subscription",
      plan_type: plan,
      order_id: orderId,
      amount_usd: amount,
      status: "pending",
    });
    if (insErr) {
      console.error("deposit insert failed", insErr.message);
      return json({ error: "Could not create order" }, 500);
    }

    // Call OxaPay v1 invoice API
    const oxaRes = await fetch("https://api.oxapay.com/v1/payment/invoice", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "merchant_api_key": OXAPAY_KEY,
      },
      body: JSON.stringify({
        amount,
        currency: "USD",
        lifetime: 30,
        fee_paid_by_payer: 1,
        under_paid_coverage: 0,
        to_currency: "USDT",
        auto_withdrawal: 0,
        mixed_payment: 0,
        callback_url: callbackUrl,
        return_url: returnUrl,
        email: claimsData.claims.email ?? "",
        order_id: orderId,
        description: `${label} subscription`,
      }),
    });

    const oxaData = await oxaRes.json().catch(() => ({}));
    // OxaPay v1 shape: { status: 200, data: { track_id, payment_url } , message }
    const track = oxaData?.data?.track_id ?? oxaData?.track_id ?? null;
    const payUrl = oxaData?.data?.payment_url ?? oxaData?.payment_url ?? null;

    if (!oxaRes.ok || !payUrl) {
      await admin.from("oxapay_deposits").update({
        status: "failed",
        raw_response: oxaData,
      }).eq("order_id", orderId);
      console.error("oxapay invoice failed", oxaRes.status, JSON.stringify(oxaData));
      return json({ error: "Payment provider error" }, 502);
    }

    await admin.from("oxapay_deposits").update({
      track_id: String(track),
      pay_link: payUrl,
      raw_response: oxaData,
    }).eq("order_id", orderId);

    return json({ payment_url: payUrl, order_id: orderId });
  } catch (e) {
    console.error("create-subscription error", (e as Error).message);
    return json({ error: "Internal error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
