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

    // Verify active subscription
    const { data: sub } = await supabase.from("subscriptions").select("status").eq("user_id", user.id).maybeSingle();
    if (!sub || sub.status !== "active") {
      return new Response(JSON.stringify({ error: "Active subscription required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { providerAccountId, markupPercent = 0, serviceIds } = await req.json();

    const { data: account, error: accErr } = await supabase
      .from("user_provider_accounts").select("*")
      .eq("id", providerAccountId).eq("user_id", user.id).single();
    if (accErr || !account) {
      return new Response(JSON.stringify({ error: "Provider account not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const formData = new URLSearchParams();
    formData.append("key", account.api_key);
    formData.append("action", "services");

    const resp = await fetch(account.api_url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    const text = await resp.text();
    let services: any[];
    try { services = JSON.parse(text); } catch {
      return new Response(JSON.stringify({ error: "Invalid response from provider", raw: text.slice(0, 500) }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!Array.isArray(services)) {
      return new Response(JSON.stringify({ error: services?.error || "Provider did not return services list" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Optional filter by selected serviceIds
    const filtered = serviceIds && Array.isArray(serviceIds) && serviceIds.length > 0
      ? services.filter((s: any) => serviceIds.includes(String(s.service)))
      : services;

    const markupMultiplier = 1 + Number(markupPercent || 0) / 100;
    const rows = filtered.map((s: any) => ({
      user_id: user.id,
      user_provider_account_id: providerAccountId,
      provider_service_id: String(s.service),
      name: String(s.name || ""),
      category: String(s.category || "Other"),
      description: s.description || null,
      price: Number(s.rate || 0) * markupMultiplier,
      markup_percent: Number(markupPercent || 0),
      min_quantity: Number(s.min || 10),
      max_quantity: Number(s.max || 100000),
      type: s.type || null,
      refill: s.refill ? "yes" : null,
      cancel_allowed: s.cancel ? "yes" : null,
      drip_feed_enabled: !!s.dripfeed,
      is_active: true,
    }));

    if (rows.length === 0) {
      return new Response(JSON.stringify({ success: true, imported: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Upsert in batches of 500 to stay within row limits
    let imported = 0;
    for (let i = 0; i < rows.length; i += 500) {
      const batch = rows.slice(i, i + 500);
      const { error: upErr, count } = await supabase
        .from("user_services")
        .upsert(batch, { onConflict: "user_provider_account_id,provider_service_id", count: "exact" });
      if (upErr) throw upErr;
      imported += count ?? batch.length;
    }

    return new Response(JSON.stringify({ success: true, imported, total: services.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("user-import-services error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
