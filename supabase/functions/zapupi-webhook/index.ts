import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const ZAP_KEY = Deno.env.get("ZAPUPI_ZAP_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function verifyOrder(orderId: string) {
  const res = await fetch("https://pay.zapupi.com/api/order-status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ zap_key: ZAP_KEY, order_id: orderId }),
  });
  return await res.json().catch(() => ({}));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Accept both JSON and form-encoded payloads from gateway
  let orderId: string | null = null;
  try {
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const j = await req.json().catch(() => ({}));
      orderId = j.order_id || j.orderId || j.order || null;
    } else {
      const text = await req.text();
      const params = new URLSearchParams(text);
      orderId = params.get("order_id") || params.get("orderId") || null;
      if (!orderId) {
        try { const j = JSON.parse(text); orderId = j.order_id || null; } catch (_) { /* */ }
      }
    }
    const url = new URL(req.url);
    if (!orderId) orderId = url.searchParams.get("order_id");
  } catch (_) { /* */ }

  if (!orderId) {
    // Always 200 to avoid gateway retry storm
    return new Response(JSON.stringify({ ok: true, note: "no order_id" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const verify = await verifyOrder(orderId);
    const inner = verify?.data ?? verify;
    const statusStr = String(inner?.status || "").toLowerCase();

    if (statusStr === "success") {
      await admin.rpc("activate_subscription_zapupi", {
        p_order_id: orderId,
        p_txn_id: inner.txn_id || inner.txnId || null,
        p_utr: inner.utr || null,
        p_gateway_response: verify,
      });
    } else if (statusStr === "failed" || statusStr === "failure" || statusStr === "expired") {
      await admin.from("zapupi_subscription_payments")
        .update({ status: "failed", gateway_response: verify })
        .eq("order_id", orderId);
    }
  } catch (e) {
    console.error("webhook err", orderId, e);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
