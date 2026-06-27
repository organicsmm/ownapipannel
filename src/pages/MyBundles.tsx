import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SubscriptionGuard } from "@/components/subscription/SubscriptionGuard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Loader2, Trash2, Package, Brain, Sparkles, CheckCircle2, X, Crown, GripVertical } from "lucide-react";
import { PLATFORM_ENGAGEMENT_TYPES, EngagementType, ENGAGEMENT_CONFIG } from "@/lib/engagement-types";

const PLATFORM_TABS: Array<{ id: string; label: string }> = [
  { id: "Instagram", label: "Instagram" },
  { id: "TikTok", label: "TikTok" },
  { id: "YouTube", label: "YouTube" },
  { id: "Twitter", label: "Twitter/X" },
  { id: "Facebook", label: "Facebook" },
];

const TAB_TO_PLATFORM_KEY: Record<string, keyof typeof PLATFORM_ENGAGEMENT_TYPES> = {
  Instagram: "instagram",
  TikTok: "tiktok",
  YouTube: "youtube",
  Twitter: "twitter",
  Facebook: "facebook",
};

export default function MyBundles() {
  return (
    <SubscriptionGuard>
      <DashboardLayout>
        <Inner />
      </DashboardLayout>
    </SubscriptionGuard>
  );
}

function Inner() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<string>("Instagram");
  const [creating, setCreating] = useState(false);
  const [bundleName, setBundleName] = useState("");

  const { data: bundles, isLoading } = useQuery({
    queryKey: ["user-bundles", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_bundles")
        .select("*, user_bundle_items(*, user_provider_accounts(id, name), user_bundle_item_providers(*, user_provider_accounts(id, name)))")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: providers } = useQuery({
    queryKey: ["user-providers-active-list", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_provider_accounts")
        .select("id, name, is_active")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const createBundle = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      if (!bundleName.trim()) throw new Error("Bundle name required");
      const { error } = await supabase.from("user_bundles").insert({
        user_id: user.id,
        name: bundleName.trim(),
        platform: tab,
        ai_organic_enabled: true,
        use_custom_ratios: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Bundle created");
      setBundleName("");
      setCreating(false);
      qc.invalidateQueries({ queryKey: ["user-bundles"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const platformBundles = (bundles || []).filter((b: any) => b.platform === tab);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" /> My Bundles
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Provider select karo aur har engagement type ka Service ID seedha box me daalo — auto import + save ho jayega.
          </p>
        </div>
        <Button onClick={() => setCreating(!creating)}>
          <Plus className="w-4 h-4 mr-2" /> Create Bundle
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {PLATFORM_TABS.map(p => <TabsTrigger key={p.id} value={p.id}>{p.label}</TabsTrigger>)}
        </TabsList>

        {PLATFORM_TABS.map(p => (
          <TabsContent key={p.id} value={p.id} className="space-y-4 mt-4">
            {creating && tab === p.id && (
              <Card className="p-5 space-y-3">
                <div>
                  <Label>Bundle Name</Label>
                  <Input placeholder={`e.g. My ${p.label} Bundle`} value={bundleName} onChange={(e) => setBundleName(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => createBundle.mutate()} disabled={createBundle.isPending || !bundleName.trim()}>
                    {createBundle.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Create
                  </Button>
                  <Button variant="ghost" onClick={() => { setCreating(false); setBundleName(""); }}>Cancel</Button>
                </div>
              </Card>
            )}

            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : platformBundles.length === 0 ? (
              <Card className="p-12 text-center">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">{p.label} ke liye koi bundle nahi hai. Create Bundle button se shuru karo.</p>
              </Card>
            ) : (
              platformBundles.map((b: any) => <BundleCard key={b.id} bundle={b} providers={providers || []} />)
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function BundleCard({ bundle, providers }: { bundle: any; providers: any[] }) {
  const qc = useQueryClient();
  const platformKey = TAB_TO_PLATFORM_KEY[bundle.platform] || "instagram";
  const availableTypes = PLATFORM_ENGAGEMENT_TYPES[platformKey] || [];
  const items: any[] = bundle.user_bundle_items || [];
  const itemsByType = new Map<string, any>(items.map(i => [i.engagement_type, i]));

  // Pick a default provider: from existing items, else first provider
  const existingProviderId = items.find(i => i.user_provider_account_id)?.user_provider_account_id;
  const [providerId, setProviderId] = useState<string>(existingProviderId || providers[0]?.id || "");

  useEffect(() => {
    if (!providerId && providers[0]?.id) setProviderId(providers[0].id);
  }, [providers, providerId]);

  const deleteBundle = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("user_bundles").delete().eq("id", bundle.id).eq("user_id", bundle.user_id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Bundle deleted");
      qc.invalidateQueries({ queryKey: ["user-bundles"] });
    },
  });

  const toggleField = useMutation({
    mutationFn: async (patch: any) => {
      const { error } = await supabase.from("user_bundles").update(patch).eq("id", bundle.id).eq("user_id", bundle.user_id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user-bundles"] }),
  });

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Package className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">{bundle.name}</h3>
            <p className="text-xs text-muted-foreground">{bundle.platform}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Active</span>
            <Switch
              checked={!!bundle.is_active}
              onCheckedChange={(v) => toggleField.mutate({ is_active: v })}
            />
          </div>
          <Button size="icon" variant="ghost" onClick={() => { if (confirm("Bundle delete karna hai?")) deleteBundle.mutate(); }}>
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      </div>

      {/* AI toggles */}
      <div className="grid md:grid-cols-2 gap-3">
        <div className={`rounded-lg border p-3 flex items-center justify-between ${bundle.ai_organic_enabled ? "border-emerald-700/40 bg-emerald-900/10" : "border-border bg-muted/30"}`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-emerald-700/20 flex items-center justify-center">
              <Brain className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <div className="font-medium text-sm flex items-center gap-2">
                AI Organic Mode <Badge variant={bundle.ai_organic_enabled ? "default" : "outline"}>{bundle.ai_organic_enabled ? "ON" : "OFF"}</Badge>
              </div>
              <div className="text-xs text-muted-foreground">Unique organic pattern per order</div>
            </div>
          </div>
          <Switch
            checked={!!bundle.ai_organic_enabled}
            onCheckedChange={(v) => toggleField.mutate({ ai_organic_enabled: v })}
          />
        </div>

        <div className={`rounded-lg border p-3 flex items-center justify-between ${!bundle.use_custom_ratios ? "border-primary/40 bg-primary/5" : "border-border bg-muted/30"}`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-primary/15 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="font-medium text-sm">AI Organic Ratios</div>
              <div className="text-xs text-muted-foreground">Auto likes/comments/etc. ratios</div>
            </div>
          </div>
          <Switch
            checked={!bundle.use_custom_ratios}
            onCheckedChange={(v) => toggleField.mutate({ use_custom_ratios: !v })}
          />
        </div>
      </div>

      {/* Provider selector */}
      <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
        <Label className="text-xs">Provider Account</Label>
        {providers.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Koi active provider nahi hai. Pehle <a href="/my-providers" className="underline text-primary">My Providers</a> me add karo.
          </p>
        ) : (
          <Select value={providerId} onValueChange={setProviderId}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Provider chuno" />
            </SelectTrigger>
            <SelectContent>
              {providers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Inline Service ID grid: all engagement types open */}
      <div className="space-y-2">
        <Label className="text-xs">Service IDs (har metric ke liye)</Label>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {availableTypes.map((t, idx) => (
            <ServiceIdBox
              key={t}
              bundleId={bundle.id}
              type={t}
              existing={itemsByType.get(t)}
              providerId={providerId}
              isFirst={idx === 0}
            />
          ))}
        </div>
      </div>
    </Card>
  );
}

function ServiceIdBox({
  bundleId, type, existing, providerId, isFirst,
}: {
  bundleId: string;
  type: EngagementType;
  existing: any | undefined;
  providerId: string;
  isFirst: boolean;
}) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [value, setValue] = useState<string>(existing?.provider_service_id || "");
  const [saving, setSaving] = useState(false);
  const cfg = ENGAGEMENT_CONFIG[type as keyof typeof ENGAGEMENT_CONFIG];
  const label = cfg?.label || type;

  useEffect(() => {
    setValue(existing?.provider_service_id || "");
  }, [existing?.provider_service_id]);

  const linked = !!existing?.provider_service_id;
  const hasChange = value.trim() !== (existing?.provider_service_id || "");

  const clear = useMutation({
    mutationFn: async () => {
      if (!existing) return;
      const { error } = await supabase.from("user_bundle_items").delete().eq("id", existing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setValue("");
      qc.invalidateQueries({ queryKey: ["user-bundles"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const saveNow = async () => {
    if (!user) return;
    const trimmed = value.trim();
    if (!trimmed) return;
    // Validate: must be digits only, 1-9 chars, > 0
    if (!/^\d{1,9}$/.test(trimmed)) {
      toast.error("Service ID sirf numbers ho sakta hai (1-9 digits)");
      return;
    }
    const asNum = parseInt(trimmed, 10);
    if (!Number.isFinite(asNum) || asNum <= 0) {
      toast.error("Service ID 0 se bada hona chahiye");
      return;
    }
    if (!providerId) {
      toast.error("Pehle provider account chuno");
      return;
    }
    setSaving(true);
    try {
      // Validate via provider
      const { data: svcData, error: svcErr } = await supabase.functions.invoke("user-import-services", {
        body: { providerAccountId: providerId, service_ids: [trimmed], fetch_only: true },
      });
      if (svcErr) {
        let realMsg = svcErr.message;
        try {
          const ctx: any = (svcErr as any).context;
          if (ctx && typeof ctx.json === "function") {
            const body = await ctx.json();
            if (body?.error) realMsg = body.error;
          }
        } catch {}
        throw new Error(realMsg);
      }
      const svc = (svcData as any)?.services?.[0];
      if (!svc) throw new Error(`Service ID "${trimmed}" provider ki list me nahi mili.`);

      const payload = {
        user_bundle_id: bundleId,
        engagement_type: type,
        provider_service_id: trimmed,
        user_provider_account_id: providerId,
        service_name: svc.name,
        rate: svc.rate,
        min_qty: svc.min,
        max_qty: svc.max,
        is_base: isFirst,
        ratio_percent: 100,
      };

      if (existing?.id) {
        const { error } = await supabase.from("user_bundle_items").update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_bundle_items").insert(payload);
        if (error) throw error;
      }
      toast.success(`${label} saved`);
      qc.invalidateQueries({ queryKey: ["user-bundles"] });
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`rounded-lg border p-3 space-y-2 ${linked ? "border-emerald-700/40 bg-emerald-900/10" : "border-border bg-muted/20"}`}>
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold capitalize">{label} Service ID</Label>
        {linked && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="e.g. 13578"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={9}
          value={value}
          onChange={(e) => {
            // Strip anything non-numeric as user types
            const cleaned = e.target.value.replace(/\D/g, "").slice(0, 9);
            setValue(cleaned);
          }}
          onBlur={() => { if (hasChange && value.trim()) saveNow(); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (hasChange && value.trim()) saveNow(); } }}
          disabled={saving}
          className="h-9"
        />
        {linked && (
          <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={() => clear.mutate()} title="Remove">
            <X className="w-4 h-4 text-destructive" />
          </Button>
        )}
      </div>
      {saving ? (
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" /> Importing service…
        </div>
      ) : linked ? (
        <div className="text-[11px] text-muted-foreground truncate">
          {existing?.service_name} • ${Number(existing?.rate || 0).toFixed(4)}/1k
        </div>
      ) : (
        <div className="text-[11px] text-muted-foreground">Number daalo, Tab/Enter dabao — auto import.</div>
      )}
    </div>
  );
}
