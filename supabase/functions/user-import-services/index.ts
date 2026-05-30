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
    const isAdmin = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if ((!sub || sub.status !== "active") && !isAdmin.data) {
      return new Response(JSON.stringify({ error: "Active subscription required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const providerAccountId = body.providerAccountId || body.user_provider_account_id;
    const markupPercent = Number(body.markupPercent || 0);
    const serviceIds: string[] | undefined = body.service_ids || body.serviceIds;
    // fetch_only: just return service details without upsert (used by MyBundles)
    const fetchOnly: boolean = !!body.fetch_only || (Array.isArray(serviceIds) && serviceIds.length > 0 && body.upsert !== true);

    if (!providerAccountId) {
      return new Response(JSON.stringify({ error: "providerAccountId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

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
      return new Response(JSON.stringify({ error: (services as any)?.error || "Provider did not return services list" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const filtered = serviceIds && Array.isArray(serviceIds) && serviceIds.length > 0
      ? services.filter((s: any) => serviceIds.includes(String(s.service)))
      : services;

    const previewServices = filtered.map((s: any) => ({
      id: String(s.service),
      name: String(s.name || ""),
      category: String(s.category || "Other"),
      rate: Number(s.rate || 0),
      min: Number(s.min || 10),
      max: Number(s.max || 100000),
      type: s.type || null,
    }));

    if (fetchOnly) {
      return new Response(JSON.stringify({ success: true, services: previewServices, total: services.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const markupMultiplier = 1 + markupPercent / 100;
    const rows = filtered.map((s: any) => ({
      user_id: user.id,
      user_provider_account_id: providerAccountId,
      provider_service_id: String(s.service),
      name: String(s.name || ""),
      category: String(s.category || "Other"),
      description: s.description || null,
      price: Number(s.rate || 0) * markupMultiplier,
      markup_percent: markupPercent,
      min_quantity: Number(s.min || 10),
      max_quantity: Number(s.max || 100000),
      type: s.type || null,
      refill: s.refill ? "yes" : null,
      cancel_allowed: s.cancel ? "yes" : null,
      drip_feed_enabled: !!s.dripfeed,
      is_active: true,
    }));

    if (rows.length === 0) {
      return new Response(JSON.stringify({ success: true, imported: 0, services: previewServices }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let imported = 0;
    for (let i = 0; i < rows.length; i += 500) {
      const batch = rows.slice(i, i + 500);
      const { error: upErr, count } = await supabase
        .from("user_services")
        .upsert(batch, { onConflict: "user_provider_account_id,provider_service_id", count: "exact" });
      if (upErr) throw upErr;
      imported += count ?? batch.length;
    }

    return new Response(JSON.stringify({ success: true, imported, total: services.length, services: previewServices }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("user-import-services error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
