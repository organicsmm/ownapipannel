import { useState } from "react";
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
import { Plus, Loader2, Trash2, Package, Brain, Sparkles, Globe, Link2, X } from "lucide-react";
import { UserProviderRotationDialog } from "@/components/bundles/UserProviderRotationDialog";
import { PLATFORM_ENGAGEMENT_TYPES, EngagementType } from "@/lib/engagement-types";

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
        .select("*, user_bundle_items(*, user_provider_accounts(id, name), user_bundle_item_providers(id))")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
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
          <p className="text-sm text-muted-foreground mt-1">Apne providers se directly service ID linked karke bundles banao — multi-provider rotation aur AI organic ratios ke saath.</p>
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
              platformBundles.map((b: any) => <BundleCard key={b.id} bundle={b} />)
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function BundleCard({ bundle }: { bundle: any }) {
  const qc = useQueryClient();
  const platformKey = TAB_TO_PLATFORM_KEY[bundle.platform] || "instagram";
  const availableTypes = PLATFORM_ENGAGEMENT_TYPES[platformKey] || [];
  const items: any[] = bundle.user_bundle_items || [];
  const itemsByType = new Map(items.map(i => [i.engagement_type, i]));

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
            <p className="text-xs text-muted-foreground">{bundle.description || "No description"}</p>
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

      {/* AI Organic Mode */}
      <div className={`rounded-lg border p-3 flex items-center justify-between ${bundle.ai_organic_enabled ? "border-emerald-700/40 bg-emerald-900/10" : "border-border bg-muted/30"}`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-emerald-700/20 flex items-center justify-center">
            <Brain className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <div className="font-medium text-sm flex items-center gap-2">
              AI Organic Mode <Badge variant={bundle.ai_organic_enabled ? "default" : "outline"}>{bundle.ai_organic_enabled ? "ON" : "OFF"}</Badge>
            </div>
            <div className="text-xs text-muted-foreground">Har order ke liye unique organic pattern auto-generate hota hai</div>
          </div>
        </div>
        <Switch
          checked={!!bundle.ai_organic_enabled}
          onCheckedChange={(v) => toggleField.mutate({ ai_organic_enabled: v })}
        />
      </div>

      {/* AI Organic Ratios (= !use_custom_ratios) */}
      <div className={`rounded-lg border p-3 flex items-center justify-between ${!bundle.use_custom_ratios ? "border-primary/40 bg-primary/5" : "border-border bg-muted/30"}`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-primary/15 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="font-medium text-sm">AI Organic Ratios</div>
            <div className="text-xs text-muted-foreground">AI automatically engagement ratios calculate karta hai (likes/comments/etc. of base views)</div>
          </div>
        </div>
        <Switch
          checked={!bundle.use_custom_ratios}
          onCheckedChange={(v) => toggleField.mutate({ use_custom_ratios: !v })}
        />
      </div>

      {/* Engagement type chips */}
      <div className="flex flex-wrap gap-2">
        {availableTypes.map(t => {
          const has = itemsByType.has(t);
          return (
            <AddOrShowChip
              key={t}
              bundleId={bundle.id}
              type={t}
              alreadyAdded={has}
              isFirst={items.length === 0 && t === availableTypes[0]}
            />
          );
        })}
      </div>

      {/* Items list */}
      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Upar se engagement type chuno (Views, Likes, etc.)</p>
        ) : items.map((it: any, idx: number) => (
          <ItemRow key={it.id} item={it} isBase={idx === 0} />
        ))}
      </div>
    </Card>
  );
}

function AddOrShowChip({ bundleId, type, alreadyAdded, isFirst }: { bundleId: string; type: EngagementType; alreadyAdded: boolean; isFirst: boolean }) {
  const qc = useQueryClient();
  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("user_bundle_items").insert({
        user_bundle_id: bundleId,
        engagement_type: type,
        is_base: isFirst,
        ratio_percent: 100,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user-bundles"] }),
    onError: (e: any) => toast.error(e.message),
  });

  if (alreadyAdded) {
    return (
      <div className="px-3 py-1.5 rounded-full bg-muted text-xs font-medium capitalize border border-border">
        {type}
      </div>
    );
  }
  return (
    <button
      onClick={() => add.mutate()}
      disabled={add.isPending}
      className="px-3 py-1.5 rounded-full bg-background border border-dashed border-border text-xs font-medium capitalize hover:border-primary hover:text-primary transition-colors flex items-center gap-1"
    >
      {type} <Plus className="w-3 h-3" />
    </button>
  );
}

function ItemRow({ item, isBase }: { item: any; isBase: boolean }) {
  const qc = useQueryClient();
  const [rotateOpen, setRotateOpen] = useState(false);
  const linked = !!item.provider_service_id && !!item.user_provider_account_id;
  const providerCount = (item.user_bundle_item_providers || []).length;

  const unlink = useMutation({
    mutationFn: async () => {
      await supabase.from("user_bundle_item_providers").delete().eq("user_bundle_item_id", item.id);
      const { error } = await supabase
        .from("user_bundle_items")
        .update({ user_provider_account_id: null, provider_service_id: null, service_name: null, rate: null })
        .eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Unlinked");
      qc.invalidateQueries({ queryKey: ["user-bundles"] });
    },
  });

  const removeItem = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("user_bundle_items").delete().eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user-bundles"] }),
  });

  return (
    <div className="border border-border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge className="capitalize">{item.engagement_type}</Badge>
          {isBase && <Badge variant="outline" className="text-xs">Base</Badge>}
        </div>
        <Button size="icon" variant="ghost" onClick={() => removeItem.mutate()}>
          <Trash2 className="w-3.5 h-3.5 text-destructive" />
        </Button>
      </div>

      {linked ? (
        <div className="flex items-center justify-between gap-2 flex-wrap bg-muted/30 rounded-md p-2">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate">{item.service_name || `Service #${item.provider_service_id}`}</div>
            <div className="text-xs text-muted-foreground">
              #{item.provider_service_id} • ${Number(item.rate || 0).toFixed(4)}/1k • {item.user_provider_accounts?.name || "provider"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-emerald-900/20 text-emerald-400 border-emerald-700/40">
              <Link2 className="w-3 h-3 mr-1" /> Linked
            </Badge>
            <Button size="sm" variant="outline" onClick={() => unlink.mutate()}>
              <X className="w-3 h-3 mr-1" /> Unlink
            </Button>
            <Button size="sm" variant="outline" onClick={() => setRotateOpen(true)}>
              <Globe className="w-3 h-3 mr-1" /> Providers {providerCount > 1 ? <span className="ml-1 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px]">{providerCount}</span> : null}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 flex-wrap bg-muted/30 rounded-md p-2">
          <div className="text-xs text-muted-foreground">
            Provider account + Service ID add karne ke liye <b>Provider</b> button dabao.
          </div>
          <Button size="sm" onClick={() => setRotateOpen(true)}>
            <Globe className="w-3 h-3 mr-1" /> Provider
          </Button>
        </div>
      )}


      <UserProviderRotationDialog
        open={rotateOpen}
        onOpenChange={setRotateOpen}
        itemId={item.id}
        engagementType={item.engagement_type}
        serviceName={item.service_name}
      />
    </div>
  );
}
