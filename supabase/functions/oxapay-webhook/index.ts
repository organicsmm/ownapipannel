// oxapay-webhook — PUBLIC endpoint. Signature-verified.
// Only path that can activate a subscription (via service-role RPC).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function hmacSha512Hex(key: string, msg: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw", enc.encode(key), { name: "HMAC", hash: "SHA-512" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(msg));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

async function logSecurity(admin: any, event: string, reason: string, metadata: any = {}) {
  try {
    await admin.from("security_audit_log").insert({
      event_type: event, reason, metadata,
    });
  } catch (_e) { /* ignore */ }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const OXAPAY_KEY = Deno.env.get("OXAPAY_MERCHANT_API_KEY");
  const admin = createClient(SUPABASE_URL, SERVICE);

  try {
    if (!OXAPAY_KEY) {
      console.error("OXAPAY_MERCHANT_API_KEY missing");
      return new Response("ok", { status: 200, headers: cors });
    }

    // Read raw body ONCE
    const raw = await req.text();
    const receivedSig = (req.headers.get("hmac") || req.headers.get("HMAC") || "").trim().toLowerCase();

    if (!receivedSig) {
      await logSecurity(admin, "webhook_no_signature", "Missing hmac header", { ip: req.headers.get("x-forwarded-for") });
      return new Response("ok", { status: 200, headers: cors });
    }

    const expectedSig = (await hmacSha512Hex(OXAPAY_KEY, raw)).toLowerCase();
    if (!constantTimeEqual(receivedSig, expectedSig)) {
      await logSecurity(admin, "webhook_bad_signature", "HMAC mismatch", { ip: req.headers.get("x-forwarded-for") });
      return new Response("invalid", { status: 401, headers: cors });
    }

    // Signature OK — parse
    const payload = JSON.parse(raw);
    // OxaPay payload common fields: type, order_id, track_id, status, amount, currency, ...
    const orderId = payload?.order_id ?? payload?.orderId;
    const trackId = payload?.track_id ?? payload?.trackId;
    const status = String(payload?.status ?? "").toLowerCase();
    const paidAmount = Number(payload?.amount ?? payload?.price_amount ?? 0);

    if (!orderId) {
      await logSecurity(admin, "webhook_missing_order", "No order_id in payload", { payload });
      return new Response("ok", { status: 200, headers: cors });
    }

    // Persist raw payload on the deposit
    await admin.from("oxapay_deposits")
      .update({ raw_response: payload, track_id: trackId ? String(trackId) : undefined })
      .eq("order_id", orderId);

    if (status !== "paid" && status !== "confirmed" && status !== "complete" && status !== "completed") {
      // Non-terminal / not paid — just log and 200
      return new Response("ok", { status: 200, headers: cors });
    }

    // Look up deposit for user_id + plan
    const { data: deposit } = await admin.from("oxapay_deposits")
      .select("user_id, plan_type, amount_usd")
      .eq("order_id", orderId).maybeSingle();

    if (!deposit) {
      await logSecurity(admin, "webhook_unknown_order", "Deposit not found", { order_id: orderId });
      return new Response("ok", { status: 200, headers: cors });
    }

    const { data: rpcData, error: rpcErr } = await admin.rpc("activate_subscription_oxapay", {
      p_user_id: deposit.user_id,
      p_order_id: orderId,
      p_plan: deposit.plan_type,
      p_amount_usd: paidAmount > 0 ? paidAmount : Number(deposit.amount_usd),
      p_track_id: trackId ? String(trackId) : null,
    });

    if (rpcErr) {
      await logSecurity(admin, "webhook_activation_error", rpcErr.message, { order_id: orderId });
    } else {
      console.log("activation result", JSON.stringify(rpcData));
    }

    return new Response("ok", { status: 200, headers: cors });
  } catch (e) {
    console.error("webhook error", (e as Error).message);
    return new Response("ok", { status: 200, headers: cors });
  }
});
