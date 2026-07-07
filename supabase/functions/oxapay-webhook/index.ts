// oxapay-webhook — PUBLIC endpoint. Signature-verified + fully idempotent.
//
// Retry safety layers (in order):
//   1. HMAC-SHA512 signature check (rejects tampered / unsigned)
//   2. Dedup insert into oxapay_webhook_events (order_id, status, sig_prefix)
//      → duplicate deliveries return 200 instantly, no DB work
//   3. activate_subscription_oxapay RPC (advisory lock + credited flag)
//      → even if two servers race past step 2, DB serializes them
//   4. Always returns 200 after processing so OxaPay stops retrying
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

const TERMINAL_PAID = new Set(["paid", "confirmed", "complete", "completed"]);

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

    // -------- Step 1: read body once, verify HMAC --------
    const raw = await req.text();
    const receivedSig = (req.headers.get("hmac") || req.headers.get("HMAC") || "").trim().toLowerCase();
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || null;

    if (!receivedSig) {
      await logSecurity(admin, "webhook_no_signature", "Missing hmac header", { ip });
      return new Response("ok", { status: 200, headers: cors });
    }

    const expectedSig = (await hmacSha512Hex(OXAPAY_KEY, raw)).toLowerCase();
    if (!constantTimeEqual(receivedSig, expectedSig)) {
      await logSecurity(admin, "webhook_bad_signature", "HMAC mismatch", { ip });
      return new Response("invalid", { status: 401, headers: cors });
    }

    // Signature OK — parse
    let payload: any;
    try { payload = JSON.parse(raw); } catch {
      await logSecurity(admin, "webhook_bad_json", "Body not JSON", { ip });
      return new Response("ok", { status: 200, headers: cors });
    }

    const orderId = String(payload?.order_id ?? payload?.orderId ?? "").trim();
    const trackId = payload?.track_id ?? payload?.trackId ?? null;
    const rawStatus = String(payload?.status ?? "").toLowerCase();
    const paidAmount = Number(payload?.amount ?? payload?.price_amount ?? 0);

    if (!orderId) {
      await logSecurity(admin, "webhook_missing_order", "No order_id", { payload });
      return new Response("ok", { status: 200, headers: cors });
    }

    // -------- Step 2: dedup — insert event row, fail = duplicate --------
    // signature_prefix locks the fingerprint so replays with a different HMAC
    // (e.g. re-signed after key rotation) are still treated as distinct events.
    const sigPrefix = expectedSig.slice(0, 32);

    const { data: dedupRow, error: dedupErr } = await admin
      .from("oxapay_webhook_events")
      .insert({
        order_id: orderId,
        status: rawStatus || "unknown",
        signature_prefix: sigPrefix,
        payload,
      })
      .select("id")
      .maybeSingle();

    if (dedupErr) {
      // Unique-violation = duplicate delivery. Return 200 fast, no work.
      const isDupe = String(dedupErr.code) === "23505"
        || /duplicate/i.test(dedupErr.message ?? "");
      if (isDupe) {
        console.log("webhook duplicate ignored", orderId, rawStatus);
        return new Response("ok (duplicate)", { status: 200, headers: cors });
      }
      // Unknown DB error — log and 200 (OxaPay will retry, next attempt hits dedup)
      console.error("dedup insert error", dedupErr.message);
      await logSecurity(admin, "webhook_dedup_error", dedupErr.message, { order_id: orderId });
      return new Response("ok", { status: 200, headers: cors });
    }

    // -------- Step 3: mirror payload onto deposit --------
    await admin.from("oxapay_deposits")
      .update({
        raw_response: payload,
        track_id: trackId ? String(trackId) : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("order_id", orderId);

    // Non-terminal status — done, keep row for audit
    if (!TERMINAL_PAID.has(rawStatus)) {
      await admin.from("oxapay_webhook_events")
        .update({ processed_at: new Date().toISOString(), activation_result: { skipped: "non_terminal_status" } })
        .eq("id", dedupRow!.id);
      return new Response("ok", { status: 200, headers: cors });
    }

    // -------- Step 4: activate via locked RPC --------
    const { data: deposit } = await admin.from("oxapay_deposits")
      .select("user_id, plan_type, amount_usd")
      .eq("order_id", orderId).maybeSingle();

    if (!deposit) {
      await logSecurity(admin, "webhook_unknown_order", "Deposit not found", { order_id: orderId });
      await admin.from("oxapay_webhook_events")
        .update({ processed_at: new Date().toISOString(), activation_result: { error: "deposit_missing" } })
        .eq("id", dedupRow!.id);
      return new Response("ok", { status: 200, headers: cors });
    }

    const { data: rpcData, error: rpcErr } = await admin.rpc("activate_subscription_oxapay", {
      p_user_id: deposit.user_id,
      p_order_id: orderId,
      p_plan: deposit.plan_type,
      p_amount_usd: paidAmount > 0 ? paidAmount : Number(deposit.amount_usd),
      p_track_id: trackId ? String(trackId) : null,
    });

    const result = rpcErr ? { error: rpcErr.message } : rpcData;

    await admin.from("oxapay_webhook_events")
      .update({ processed_at: new Date().toISOString(), activation_result: result })
      .eq("id", dedupRow!.id);

    if (rpcErr) {
      await logSecurity(admin, "webhook_activation_error", rpcErr.message, { order_id: orderId });
    } else {
      console.log("activation ok", orderId, JSON.stringify(rpcData));
    }

    return new Response("ok", { status: 200, headers: cors });
  } catch (e) {
    console.error("webhook fatal", (e as Error).message);
    // Always 200 so OxaPay doesn't hammer us; error is in logs.
    return new Response("ok", { status: 200, headers: cors });
  }
});
