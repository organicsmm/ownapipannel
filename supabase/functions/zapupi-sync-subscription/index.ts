import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const ZAP_KEY = Deno.env.get("ZAPUPI_ZAP_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

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
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { order_id } = await req.json().catch(() => ({}));
    if (!order_id || typeof order_id !== "string") {
      return new Response(JSON.stringify({ error: "order_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: payment } = await admin
      .from("zapupi_subscription_payments")
      .select("*").eq("order_id", order_id).maybeSingle();
    if (!payment) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (payment.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Not your order" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payment.activated) {
      return new Response(JSON.stringify({
        status: "success", activated: true, plan_type: payment.plan_type, already: true,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    const res = await fetch("https://pay.zapupi.com/api/order-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ zap_key: ZAP_KEY, order_id }),
    });
    const verify = await res.json().catch(() => ({}));
    const inner = verify?.data ?? verify;
    const statusStr = String(inner?.status || "").toLowerCase();

    if (statusStr === "success") {
      const { data: rpc } = await admin.rpc("activate_subscription_zapupi", {
        p_order_id: order_id,
        p_txn_id: inner.txn_id || inner.txnId || null,
        p_utr: inner.utr || null,
        p_gateway_response: verify,
      });
      return new Response(JSON.stringify({
        status: "success", activated: true, plan_type: payment.plan_type, rpc,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    if (statusStr === "failed" || statusStr === "failure" || statusStr === "expired") {
      await admin.from("zapupi_subscription_payments")
        .update({ status: "failed", gateway_response: verify })
        .eq("order_id", order_id);
      return new Response(JSON.stringify({ status: "failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    return new Response(JSON.stringify({ status: "pending", gateway: inner }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (e) {
    console.error("sync err", e);
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
