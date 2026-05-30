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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Loader2, Trash2, Package, Download } from "lucide-react";

const PLATFORMS = ["Instagram", "YouTube", "TikTok", "Facebook", "Twitter", "Telegram", "Spotify", "Other"];
const ENGAGEMENT_TYPES = ["views", "likes", "comments", "shares", "followers", "subscribers", "saves", "reposts"];

export default function MyBundles() {
  return (
    <SubscriptionGuard>
      <DashboardLayout>
        <MyBundlesInner />
      </DashboardLayout>
    </SubscriptionGuard>
  );
}

function MyBundlesInner() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [bundleForm, setBundleForm] = useState({ name: "", platform: "Instagram", description: "" });

  const { data: bundles, isLoading } = useQuery({
    queryKey: ["user-bundles", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_bundles")
        .select("*, user_bundle_items(*, user_provider_accounts(name))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const createBundle = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("user_bundles").insert({
        user_id: user.id,
        name: bundleForm.name.trim(),
        platform: bundleForm.platform,
        description: bundleForm.description.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Bundle created");
      setBundleForm({ name: "", platform: "Instagram", description: "" });
      setCreating(false);
      qc.invalidateQueries({ queryKey: ["user-bundles"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteBundle = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_bundles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Bundle deleted");
      qc.invalidateQueries({ queryKey: ["user-bundles"] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Bundles</h1>
          <p className="text-sm text-muted-foreground mt-1">Apne provider se directly service ID import karke bundle banao.</p>
        </div>
        <Button onClick={() => setCreating(!creating)}>
          <Plus className="w-4 h-4 mr-2" /> New Bundle
        </Button>
      </div>

      {creating && (
        <Card className="p-6 space-y-4">
          <div>
            <Label>Bundle Name</Label>
            <Input value={bundleForm.name} onChange={(e) => setBundleForm({ ...bundleForm, name: e.target.value })} placeholder="e.g. Instagram Reel Boost" />
          </div>
          <div>
            <Label>Platform</Label>
            <Select value={bundleForm.platform} onValueChange={(v) => setBundleForm({ ...bundleForm, platform: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Input value={bundleForm.description} onChange={(e) => setBundleForm({ ...bundleForm, description: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => createBundle.mutate()} disabled={!bundleForm.name || createBundle.isPending}>
              {createBundle.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create
            </Button>
            <Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : bundles && bundles.length > 0 ? (
        <div className="grid gap-4">
          {bundles.map((b: any) => (
            <BundleCard key={b.id} bundle={b} onDelete={() => { if (confirm("Delete bundle?")) deleteBundle.mutate(b.id); }} />
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Koi bundle nahi hai. New Bundle button se shuru karo.</p>
        </Card>
      )}
    </div>
  );
}

function BundleCard({ bundle, onDelete }: { bundle: any; onDelete: () => void }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [addingItem, setAddingItem] = useState(false);
  const [itemForm, setItemForm] = useState({
    engagement_type: "likes",
    user_provider_account_id: "",
    provider_service_id: "",
    ratio_percent: 100,
  });
  const [importing, setImporting] = useState(false);

  const { data: providers } = useQuery({
    queryKey: ["user-providers-list", user?.id],
    enabled: !!user && addingItem,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_provider_accounts")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      return data || [];
    },
  });

  const importService = async () => {
    if (!itemForm.user_provider_account_id || !itemForm.provider_service_id) {
      toast.error("Provider aur service ID select/enter karo");
      return null;
    }
    setImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("user-import-services", {
        body: {
          user_provider_account_id: itemForm.user_provider_account_id,
          service_ids: [itemForm.provider_service_id],
        },
      });
      if (error) throw error;
      const svc = data?.services?.[0];
      if (!svc) throw new Error("Service nahi mili provider par");
      return svc;
    } catch (e: any) {
      toast.error(e.message || "Import fail");
      return null;
    } finally {
      setImporting(false);
    }
  };

  const addItem = useMutation({
    mutationFn: async () => {
      const svc = await importService();
      if (!svc) throw new Error("aborted");
      const { error } = await supabase.from("user_bundle_items").insert({
        user_bundle_id: bundle.id,
        engagement_type: itemForm.engagement_type,
        user_provider_account_id: itemForm.user_provider_account_id,
        provider_service_id: itemForm.provider_service_id,
        service_name: svc.name,
        rate: svc.rate,
        min_qty: svc.min,
        max_qty: svc.max,
        ratio_percent: itemForm.ratio_percent,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Service imported & added to bundle");
      setItemForm({ engagement_type: "likes", user_provider_account_id: "", provider_service_id: "", ratio_percent: 100 });
      setAddingItem(false);
      qc.invalidateQueries({ queryKey: ["user-bundles"] });
    },
    onError: (e: any) => { if (e.message !== "aborted") toast.error(e.message); },
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_bundle_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user-bundles"] }),
  });

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground">{bundle.name}</h3>
            <Badge variant="outline">{bundle.platform}</Badge>
          </div>
          {bundle.description && <p className="text-xs text-muted-foreground">{bundle.description}</p>}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setAddingItem(!addingItem)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Item
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete}>
            <Trash2 className="w-3.5 h-3.5 text-destructive" />
          </Button>
        </div>
      </div>

      {addingItem && (
        <div className="border border-border rounded-lg p-3 mb-3 space-y-2">
          <div className="grid sm:grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Engagement Type</Label>
              <Select value={itemForm.engagement_type} onValueChange={(v) => setItemForm({ ...itemForm, engagement_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ENGAGEMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Provider</Label>
              <Select value={itemForm.user_provider_account_id} onValueChange={(v) => setItemForm({ ...itemForm, user_provider_account_id: v })}>
                <SelectTrigger><SelectValue placeholder="Apna provider" /></SelectTrigger>
                <SelectContent>
                  {(providers || []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Provider Service ID</Label>
              <Input
                placeholder="e.g. 1234"
                value={itemForm.provider_service_id}
                onChange={(e) => setItemForm({ ...itemForm, provider_service_id: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Ratio %</Label>
              <Input
                type="number"
                value={itemForm.ratio_percent}
                onChange={(e) => setItemForm({ ...itemForm, ratio_percent: Number(e.target.value) })}
              />
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => addItem.mutate()}
            disabled={!itemForm.user_provider_account_id || !itemForm.provider_service_id || addItem.isPending || importing}
          >
            {(addItem.isPending || importing) ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1" />}
            Import & Add
          </Button>
        </div>
      )}

      <div className="space-y-1.5">
        {(bundle.user_bundle_items || []).length === 0 ? (
          <p className="text-xs text-muted-foreground">No items yet. Provider se service ID import karke add karo.</p>
        ) : (
          bundle.user_bundle_items.map((item: any) => (
            <div key={item.id} className="flex items-center justify-between text-sm py-2 px-3 rounded-md bg-muted/30">
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <Badge className="capitalize">{item.engagement_type}</Badge>
                <span className="text-xs text-muted-foreground truncate max-w-[280px]">
                  {item.service_name || "service"}
                </span>
                <span className="text-xs text-muted-foreground">
                  • #{item.provider_service_id} • {item.user_provider_accounts?.name || "?"} • {item.ratio_percent}%
                </span>
              </div>
              <Button size="sm" variant="ghost" onClick={() => removeItem.mutate(item.id)}>
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
