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

    const { providerAccountId } = await req.json();
    const { data: account, error: accErr } = await supabase
      .from("user_provider_accounts")
      .select("*")
      .eq("id", providerAccountId)
      .eq("user_id", user.id)
      .single();

    if (accErr || !account) {
      return new Response(JSON.stringify({ error: "Provider account not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const formData = new URLSearchParams();
    formData.append("key", account.api_key);
    formData.append("action", "balance");

    const resp = await fetch(account.api_url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    const text = await resp.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (!resp.ok || data.error) {
      await supabase.from("user_provider_accounts").update({
        last_balance_error: data.error || `HTTP ${resp.status}`,
        balance_checked_at: new Date().toISOString(),
      }).eq("id", providerAccountId);
      return new Response(JSON.stringify({ error: data.error || "Balance fetch failed", details: data }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const balance = Number(data.balance ?? 0);
    const currency = data.currency || "USD";

    await supabase.from("user_provider_accounts").update({
      balance, balance_currency: currency, balance_checked_at: new Date().toISOString(), last_balance_error: null,
    }).eq("id", providerAccountId);

    return new Response(JSON.stringify({ success: true, balance, currency }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
