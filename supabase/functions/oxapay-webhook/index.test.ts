// Idempotency & signature tests for oxapay-webhook.
//
// - Always runs: bad-signature (401), missing-signature (200 swallow).
// - When OXAPAY_MERCHANT_API_KEY is present in the local env, also runs:
//     • replay: same body sent twice → 2nd is deduped
//     • concurrent: N parallel deliveries → exactly one processes, rest dedup
//     • malformed JSON with valid HMAC → 200 (logged, not retried)
//
// The signed tests use a synthetic order_id (oxs_test_<uuid>) so we never
// touch a real deposit — the RPC path is never reached; we're specifically
// verifying the dedup layer.
//
// Load env from repo root .env; OXAPAY key is optional and gated per-test.
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL");
const ANON_KEY =
  Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");
const OXAPAY_KEY = Deno.env.get("OXAPAY_MERCHANT_API_KEY");

if (!SUPABASE_URL || !ANON_KEY) {
  throw new Error("VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY missing in .env");
}

const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/oxapay-webhook`;

async function hmacSha512Hex(key: string, msg: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(msg));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function baseHeaders(hmac?: string): HeadersInit {
  const h: Record<string, string> = {
    "content-type": "application/json",
    // Public function, but anon key is needed to pass the gateway.
    apikey: ANON_KEY!,
    Authorization: `Bearer ${ANON_KEY}`,
  };
  if (hmac) h.hmac = hmac;
  return h;
}

async function postWebhook(body: string, hmac?: string) {
  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: baseHeaders(hmac),
    body,
  });
  const text = await res.text();
  return { status: res.status, text };
}

function fakeOrderId() {
  return `oxs_test_${crypto.randomUUID()}`;
}

// -------------------- Always-on tests --------------------

Deno.test("rejects tampered HMAC with 401", async () => {
  const body = JSON.stringify({ order_id: fakeOrderId(), status: "Paid", amount: 35 });
  const badSig = "0".repeat(128); // valid length, wrong bytes
  const { status, text } = await postWebhook(body, badSig);
  assertEquals(status, 401, `expected 401 for bad sig, got ${status} — ${text}`);
});

Deno.test("swallows missing HMAC header with 200 (no retry storm)", async () => {
  const body = JSON.stringify({ order_id: fakeOrderId(), status: "Paid", amount: 35 });
  const { status } = await postWebhook(body); // no hmac
  assertEquals(status, 200);
});

// -------------------- Signed-only tests --------------------

const signed = OXAPAY_KEY ? Deno.test : Deno.test.ignore;

if (!OXAPAY_KEY) {
  console.warn(
    "[oxapay-webhook tests] OXAPAY_MERCHANT_API_KEY not set locally — " +
      "skipping replay/concurrent/malformed tests. Add it to .env to enable.",
  );
}

signed("replay: same signed body twice → 2nd is deduped", async () => {
  const body = JSON.stringify({
    order_id: fakeOrderId(),
    status: "Paid",
    amount: 35,
    track_id: `trk_${Date.now()}`,
  });
  const sig = await hmacSha512Hex(OXAPAY_KEY!, body);

  const first = await postWebhook(body, sig);
  const second = await postWebhook(body, sig);

  assertEquals(first.status, 200);
  assertEquals(second.status, 200);
  assert(
    /duplicate/i.test(second.text),
    `expected duplicate marker in second response, got: ${second.text}`,
  );
  // First delivery is either standard "ok" (dedup inserted) or "ok" with
  // deposit-missing outcome — but must NOT itself be flagged duplicate.
  assert(
    !/duplicate/i.test(first.text),
    `first delivery unexpectedly deduped: ${first.text}`,
  );
});

signed("concurrent: N parallel deliveries → exactly one processes", async () => {
  const body = JSON.stringify({
    order_id: fakeOrderId(),
    status: "Paid",
    amount: 35,
    track_id: `trk_${Date.now()}`,
  });
  const sig = await hmacSha512Hex(OXAPAY_KEY!, body);

  const N = 6;
  const results = await Promise.all(
    Array.from({ length: N }, () => postWebhook(body, sig)),
  );

  for (const r of results) assertEquals(r.status, 200);

  const winners = results.filter((r) => !/duplicate/i.test(r.text));
  const dupes = results.filter((r) => /duplicate/i.test(r.text));

  assertEquals(
    winners.length,
    1,
    `expected exactly one non-duplicate response, got ${winners.length}. ` +
      `Bodies: ${JSON.stringify(results.map((r) => r.text))}`,
  );
  assertEquals(dupes.length, N - 1);
});

signed("different status for same order_id is NOT treated as duplicate", async () => {
  const orderId = fakeOrderId();
  const paying = JSON.stringify({ order_id: orderId, status: "Waiting", amount: 35 });
  const paid = JSON.stringify({ order_id: orderId, status: "Paid", amount: 35 });

  const sig1 = await hmacSha512Hex(OXAPAY_KEY!, paying);
  const sig2 = await hmacSha512Hex(OXAPAY_KEY!, paid);

  const r1 = await postWebhook(paying, sig1);
  const r2 = await postWebhook(paid, sig2);

  assertEquals(r1.status, 200);
  assertEquals(r2.status, 200);
  assert(!/duplicate/i.test(r1.text));
  assert(
    !/duplicate/i.test(r2.text),
    "status transition (Waiting → Paid) must not be deduped as replay",
  );
});

signed("malformed JSON with valid HMAC → 200 (no retry)", async () => {
  const body = "{not-json";
  const sig = await hmacSha512Hex(OXAPAY_KEY!, body);
  const { status } = await postWebhook(body, sig);
  assertEquals(status, 200);
});
