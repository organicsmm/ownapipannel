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
  const allTypes = PLATFORM_ENGAGEMENT_TYPES[platformKey] || [];
  const items: any[] = bundle.user_bundle_items || [];
  const itemsByType = new Map<string, any>(items.map(i => [i.engagement_type, i]));
  const hiddenTypes: string[] = Array.isArray(bundle.hidden_engagement_types) ? bundle.hidden_engagement_types : [];
  const visibleTypes = allTypes.filter(t => !hiddenTypes.includes(t));
  const removedTypes = allTypes.filter(t => hiddenTypes.includes(t));

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

  const hideType = useMutation({
    mutationFn: async (t: string) => {
      // Remove any item rows for this type first (cascade kills mappings).
      const existing = itemsByType.get(t);
      if (existing?.id) {
        await supabase.from("user_bundle_items").delete().eq("id", existing.id);
      }
      const next = Array.from(new Set([...(hiddenTypes || []), t]));
      const { error } = await supabase
        .from("user_bundles")
        .update({ hidden_engagement_types: next } as any)
        .eq("id", bundle.id)
        .eq("user_id", bundle.user_id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Metric bundle se hata diya");
      qc.invalidateQueries({ queryKey: ["user-bundles"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const showType = useMutation({
    mutationFn: async (t: string) => {
      const next = (hiddenTypes || []).filter(x => x !== t);
      const { error } = await supabase
        .from("user_bundles")
        .update({ hidden_engagement_types: next } as any)
        .eq("id", bundle.id)
        .eq("user_id", bundle.user_id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user-bundles"] }),
    onError: (e: any) => toast.error(e.message),
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

      {providers.length === 0 ? (
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">
            Koi active provider nahi hai. Pehle <a href="/my-providers" className="underline text-primary">My Providers</a> me add karo.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <Label className="text-xs">Service IDs (har metric ke liye, har provider ke liye priority-wise)</Label>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visibleTypes.map((t, idx) => (
              <EngagementTypeBox
                key={t}
                bundleId={bundle.id}
                type={t}
                existing={itemsByType.get(t)}
                providers={providers}
                isFirst={idx === 0}
                onRemoveType={() => {
                  if (confirm(`${(ENGAGEMENT_CONFIG as any)[t]?.label || t} ko bundle se hata do?`)) hideType.mutate(t);
                }}
              />
            ))}
          </div>

          {removedTypes.length > 0 && (
            <div className="rounded-lg border border-dashed border-border p-3 space-y-2">
              <Label className="text-xs text-muted-foreground">Removed metrics (wapas add karne ke liye click karo)</Label>
              <div className="flex flex-wrap gap-2">
                {removedTypes.map(t => (
                  <button
                    key={t}
                    onClick={() => showType.mutate(t)}
                    className="px-3 py-1.5 rounded-full bg-background border border-dashed border-border text-xs font-medium capitalize hover:border-primary hover:text-primary transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> {(ENGAGEMENT_CONFIG as any)[t]?.label || t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

/**
 * Per-engagement-type card. Renders one row per provider account, each with
 * a Priority + Service ID input. Lowest-priority filled row becomes the primary
 * (mirrored onto user_bundle_items for backwards compat with order flow).
 */
function EngagementTypeBox({
  bundleId, type, existing, providers, isFirst, onRemoveType,
}: {
  bundleId: string;
  type: EngagementType;
  existing: any | undefined;
  providers: any[];
  isFirst: boolean;
  onRemoveType: () => void;
}) {
  const qc = useQueryClient();
  const cfg = ENGAGEMENT_CONFIG[type as keyof typeof ENGAGEMENT_CONFIG];
  const label = cfg?.label || type;
  const mappings: any[] = existing?.user_bundle_item_providers || [];
  const mappingsByProvider = new Map<string, any>(mappings.map(m => [m.user_provider_account_id, m]));
  const linkedCount = mappings.length;
  const primaryProviderId = existing?.user_provider_account_id;

  return (
    <div className={`rounded-lg border p-3 space-y-3 ${linkedCount > 0 ? "border-emerald-700/40 bg-emerald-900/5" : "border-border bg-muted/10"}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-semibold capitalize">{label}</Label>
          {linkedCount > 0 && (
            <Badge variant="outline" className="bg-emerald-900/20 text-emerald-400 border-emerald-700/40 text-[10px]">
              <CheckCircle2 className="w-3 h-3 mr-1" /> {linkedCount} provider{linkedCount > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={onRemoveType}
          title={`${label} ko bundle se hata do`}
          className="h-7 w-7 text-destructive hover:text-destructive"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="space-y-1.5">
        {providers.map((p, idx) => (
          <ProviderRow
            key={p.id}
            bundleId={bundleId}
            type={type}
            isFirst={isFirst}
            existingItem={existing}
            provider={p}
            mapping={mappingsByProvider.get(p.id)}
            defaultPriority={idx + 1}
            isPrimary={primaryProviderId === p.id}
          />
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground leading-tight">Priority 1 = pehle try, fail ho to 2…</p>
    </div>
  );
}

function ProviderRow({
  bundleId, type, isFirst, existingItem, provider, mapping, defaultPriority, isPrimary,
}: {
  bundleId: string;
  type: EngagementType;
  isFirst: boolean;
  existingItem: any | undefined;
  provider: any;
  mapping: any | undefined;
  defaultPriority: number;
  isPrimary: boolean;
}) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [serviceId, setServiceId] = useState<string>(mapping?.provider_service_id || "");
  const [priority, setPriority] = useState<number>(mapping?.priority ?? defaultPriority);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setServiceId(mapping?.provider_service_id || "");
    setPriority(mapping?.priority ?? defaultPriority);
  }, [mapping?.provider_service_id, mapping?.priority, defaultPriority]);

  const linked = !!mapping?.provider_service_id;
  const valChanged = serviceId.trim() !== (mapping?.provider_service_id || "");
  const prioChanged = Number(priority) !== (mapping?.priority ?? defaultPriority);

  /** Ensure user_bundle_items row exists; returns its id. */
  const ensureItem = async (): Promise<string> => {
    if (existingItem?.id) return existingItem.id;
    const { data, error } = await supabase
      .from("user_bundle_items")
      .insert({
        user_bundle_id: bundleId,
        engagement_type: type,
        is_base: isFirst,
        ratio_percent: 100,
      })
      .select("id")
      .single();
    if (error) throw error;
    return data.id;
  };

  /** Recompute primary on user_bundle_items from the lowest-priority active mapping. */
  const syncPrimary = async (itemId: string) => {
    const { data: rows } = await supabase
      .from("user_bundle_item_providers")
      .select("*")
      .eq("user_bundle_item_id", itemId)
      .eq("is_active", true)
      .order("priority", { ascending: true });
    const top = rows?.[0];
    if (!top) {
      await supabase.from("user_bundle_items").update({
        user_provider_account_id: null,
        provider_service_id: null,
        service_name: null,
        rate: null,
      }).eq("id", itemId);
      return;
    }
    // Fetch service meta for the new primary to keep order flow accurate.
    try {
      const { data: svcData } = await supabase.functions.invoke("user-import-services", {
        body: { providerAccountId: top.user_provider_account_id, service_ids: [top.provider_service_id], fetch_only: true },
      });
      const svc = (svcData as any)?.services?.[0];
      await supabase.from("user_bundle_items").update({
        user_provider_account_id: top.user_provider_account_id,
        provider_service_id: top.provider_service_id,
        service_name: svc?.name ?? null,
        rate: svc?.rate ?? null,
        min_qty: svc?.min ?? null,
        max_qty: svc?.max ?? null,
      }).eq("id", itemId);
    } catch {
      await supabase.from("user_bundle_items").update({
        user_provider_account_id: top.user_provider_account_id,
        provider_service_id: top.provider_service_id,
      }).eq("id", itemId);
    }
  };

  const removeRow = async () => {
    if (!mapping?.id) {
      setServiceId("");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("user_bundle_item_providers").delete().eq("id", mapping.id);
      if (error) throw error;
      if (existingItem?.id) await syncPrimary(existingItem.id);
      toast.success("Provider hata diya");
      qc.invalidateQueries({ queryKey: ["user-bundles"] });
    } catch (e: any) {
      toast.error(e.message || "Remove failed");
    } finally {
      setSaving(false);
    }
  };

  const saveRow = async () => {
    if (!user) return;
    const trimmed = serviceId.trim();
    // Empty + existing => delete
    if (!trimmed) {
      if (mapping?.id) await removeRow();
      return;
    }
    if (!/^\d{1,9}$/.test(trimmed)) {
      toast.error("Service ID sirf numbers ho sakta hai (1-9 digits)");
      return;
    }
    const prio = Math.max(1, Math.min(99, Number(priority) || 1));
    setSaving(true);
    try {
      // Validate via provider
      const { data: svcData, error: svcErr } = await supabase.functions.invoke("user-import-services", {
        body: { providerAccountId: provider.id, service_ids: [trimmed], fetch_only: true },
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
      if (!svc) throw new Error(`Service ID "${trimmed}" ${provider.name} ki list me nahi mili.`);

      const itemId = await ensureItem();

      const { error: upErr } = await supabase
        .from("user_bundle_item_providers")
        .upsert({
          user_id: user.id,
          user_bundle_item_id: itemId,
          user_provider_account_id: provider.id,
          provider_service_id: trimmed,
          priority: prio,
          is_active: true,
        }, { onConflict: "user_bundle_item_id,user_provider_account_id" });
      if (upErr) throw upErr;

      await syncPrimary(itemId);
      toast.success(`${provider.name} saved`);
      qc.invalidateQueries({ queryKey: ["user-bundles"] });
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`grid grid-cols-[60px_1fr_1.4fr_36px] gap-2 items-center rounded-md p-2 ${linked ? "bg-muted/40" : "bg-muted/10"}`}>
      <Input
        type="number"
        min={1}
        max={99}
        value={priority}
        onChange={(e) => setPriority(Number(e.target.value) || 1)}
        onBlur={() => { if ((linked && prioChanged) || (serviceId.trim() && (valChanged || prioChanged))) saveRow(); }}
        disabled={saving}
        className="h-9 text-center"
        title="Priority (1 = highest)"
      />
      <div className="min-w-0 flex items-center gap-1.5">
        {isPrimary && <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{provider.name}</div>
          {linked && mapping?.provider_service_id && (
            <div className="text-[10px] text-muted-foreground truncate">ID #{mapping.provider_service_id}</div>
          )}
        </div>
      </div>
      <Input
        placeholder="Service ID e.g. 13578"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={9}
        value={serviceId}
        onChange={(e) => setServiceId(e.target.value.replace(/\D/g, "").slice(0, 9))}
        onBlur={() => { if (valChanged || (serviceId.trim() && prioChanged)) saveRow(); }}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (valChanged || prioChanged) saveRow(); } }}
        disabled={saving}
        className="h-9"
      />
      <Button
        size="icon"
        variant="ghost"
        className="h-9 w-9"
        onClick={removeRow}
        disabled={saving || !linked}
        title="Remove provider"
      >
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5 text-destructive" />}
      </Button>
    </div>
  );
}

