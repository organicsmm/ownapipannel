import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: sub } = await supabase.from("subscriptions").select("status").eq("user_id", user.id).maybeSingle();
    if (!sub || sub.status !== "active") {
      return new Response(JSON.stringify({ error: "Active subscription required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { userServiceId, link, quantity } = await req.json();
    if (!userServiceId || !link || !quantity || quantity < 1) {
      return new Response(JSON.stringify({ error: "userServiceId, link and quantity required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: svc, error: svcErr } = await supabase
      .from("user_services").select("*, user_provider_accounts!inner(api_url, api_key, user_id)")
      .eq("id", userServiceId).eq("user_id", user.id).single();
    if (svcErr || !svc) {
      return new Response(JSON.stringify({ error: "Service not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const account: any = (svc as any).user_provider_accounts;

    if (quantity < svc.min_quantity || quantity > svc.max_quantity) {
      return new Response(JSON.stringify({ error: `Quantity must be between ${svc.min_quantity} and ${svc.max_quantity}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const formData = new URLSearchParams();
    formData.append("key", account.api_key);
    formData.append("action", "add");
    formData.append("service", String(svc.provider_service_id));
    formData.append("link", link);
    formData.append("quantity", String(quantity));

    const resp = await fetch(account.api_url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });
    const text = await resp.text();
    let providerResp: any;
    try { providerResp = JSON.parse(text); } catch { providerResp = { raw: text }; }

    if (!resp.ok || providerResp.error || !providerResp.order) {
      return new Response(JSON.stringify({ error: providerResp.error || "Provider rejected order", details: providerResp }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const price = Number(svc.price) * (quantity / 1000);

    const { data: order, error: ordErr } = await supabase.from("orders").insert({
      user_id: user.id,
      link,
      quantity,
      price,
      status: "processing",
      provider_order_id: String(providerResp.order),
      use_user_api: true,
      user_provider_account_id: svc.user_provider_account_id,
      user_service_id: svc.id,
    }).select().single();

    if (ordErr) throw ordErr;

    return new Response(JSON.stringify({ success: true, order, providerOrderId: providerResp.order }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("user-place-order error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
