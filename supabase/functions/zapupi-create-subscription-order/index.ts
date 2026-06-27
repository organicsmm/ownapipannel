import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const ZAP_KEY = Deno.env.get("ZAPUPI_ZAP_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

function appOrigin(req: Request): string {
  // Prefer origin header sent by browser, fallback to published domain.
  const origin = req.headers.get("origin");
  if (origin && /^https?:\/\//.test(origin)) return origin.replace(/\/$/, "");
  return "https://ownapipannel.lovable.app";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    const userId = claims?.claims?.sub;
    const userEmail = claims?.claims?.email || "user";
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const planType = body.plan_type;
    const customerMobile = String(body.customer_mobile || "9999999999").replace(/\D/g, "").slice(-10) || "9999999999";

    if (planType !== "monthly" && planType !== "lifetime") {
      return new Response(JSON.stringify({ error: "Invalid plan_type" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Server-side price
    const { data: plan, error: planErr } = await admin
      .from("subscription_plans")
      .select("*")
      .eq("plan_type", planType)
      .eq("is_active", true)
      .maybeSingle();
    if (planErr || !plan) {
      return new Response(JSON.stringify({ error: "Plan not available" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Block if already has lifetime active
    const { data: existingSub } = await admin
      .from("subscriptions").select("*").eq("user_id", userId).maybeSingle();
    if (existingSub?.status === "active" && existingSub.plan_type === "lifetime") {
      return new Response(JSON.stringify({ error: "You already have a Lifetime subscription" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orderId = `SUB_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
    const origin = appOrigin(req);
    const amountStr = Number(plan.price_inr).toFixed(2);

    // Insert pending payment row
    const { error: insertErr } = await admin.from("zapupi_subscription_payments").insert({
      user_id: userId,
      plan_type: planType,
      order_id: orderId,
      amount_inr: plan.price_inr,
      status: "pending",
    });
    if (insertErr) throw insertErr;

    // Call ZapUPI
    const webhookUrl = `${SUPABASE_URL}/functions/v1/zapupi-webhook`;
    const returnBase = `${origin}/subscription/return?order_id=${orderId}`;
    const payload = {
      zap_key: ZAP_KEY,
      order_id: orderId,
      amount: amountStr,
      customer_mobile: customerMobile,
      remark: `${planType === "monthly" ? "Monthly Plan" : "Lifetime Plan"} | ${userEmail}`,
      webhook_url: webhookUrl,
      success_url: `${returnBase}&status=success`,
      failed_url: `${returnBase}&status=failed`,
      timeout_url: `${returnBase}&status=timeout`,
      redirect_url: `${returnBase}&status=success`,
    };

    const zapRes = await fetch("https://pay.zapupi.com/api/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const zapJson = await zapRes.json().catch(() => ({}));

    if (zapJson?.status !== "success" || !zapJson?.payment_url) {
      await admin.from("zapupi_subscription_payments")
        .update({ status: "failed", gateway_response: zapJson })
        .eq("order_id", orderId);
      return new Response(JSON.stringify({ error: "Gateway error", details: zapJson }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin.from("zapupi_subscription_payments")
      .update({ payment_url: zapJson.payment_url, gateway_response: zapJson })
      .eq("order_id", orderId);

    return new Response(JSON.stringify({ order_id: orderId, payment_url: zapJson.payment_url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (e) {
    console.error("create-subscription-order error", e);
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
