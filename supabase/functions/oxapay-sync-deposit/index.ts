// oxapay-sync-deposit — user-triggered poll after they return from OxaPay.
// Fetches true status from OxaPay server-side and activates if paid.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const OXAPAY_KEY = Deno.env.get("OXAPAY_MERCHANT_API_KEY");
    if (!OXAPAY_KEY) return json({ error: "Not configured" }, 500);

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const userId = claimsData.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const orderId = String(body?.order_id ?? "").trim();
    if (!orderId) return json({ error: "order_id required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE);

    // User can only sync their own deposit
    const { data: deposit } = await admin
      .from("oxapay_deposits")
      .select("id, user_id, plan_type, amount_usd, track_id, status, credited")
      .eq("order_id", orderId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!deposit) return json({ error: "Order not found" }, 404);

    if (deposit.credited) {
      return json({ credited: true, status: "credited" });
    }
    if (!deposit.track_id) {
      return json({ credited: false, status: deposit.status });
    }

    // Query OxaPay for true status
    const oxaRes = await fetch(`https://api.oxapay.com/v1/payment/${encodeURIComponent(deposit.track_id)}`, {
      method: "GET",
      headers: { "merchant_api_key": OXAPAY_KEY },
    });
    const oxaData = await oxaRes.json().catch(() => ({}));
    const payStatus = String(oxaData?.data?.status ?? oxaData?.status ?? "").toLowerCase();
    const paidAmount = Number(oxaData?.data?.amount ?? oxaData?.amount ?? deposit.amount_usd);

    if (payStatus === "paid" || payStatus === "confirmed" || payStatus === "complete" || payStatus === "completed") {
      const { data: rpcData, error: rpcErr } = await admin.rpc("activate_subscription_oxapay", {
        p_user_id: deposit.user_id,
        p_order_id: orderId,
        p_plan: deposit.plan_type,
        p_amount_usd: paidAmount,
        p_track_id: deposit.track_id,
      });
      if (rpcErr) {
        console.error("sync activation error", rpcErr.message);
        return json({ credited: false, status: "activation_failed", detail: rpcErr.message }, 500);
      }
      return json({ credited: true, status: "credited", detail: rpcData });
    }

    return json({ credited: false, status: payStatus || "pending" });
  } catch (e) {
    console.error("sync error", (e as Error).message);
    return json({ error: "Internal error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
