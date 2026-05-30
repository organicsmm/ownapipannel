import { useMemo, useState } from "react";
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
import { Download, Loader2, Search, ShoppingCart, Trash2 } from "lucide-react";

export default function MyServices() {
  return (
    <SubscriptionGuard>
      <DashboardLayout>
        <MyServicesInner />
      </DashboardLayout>
    </SubscriptionGuard>
  );
}

function MyServicesInner() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [importProvider, setImportProvider] = useState<string>("");
  const [markup, setMarkup] = useState<number>(0);
  const [importing, setImporting] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");

  // Order dialog state
  const [orderSvc, setOrderSvc] = useState<any | null>(null);
  const [orderLink, setOrderLink] = useState("");
  const [orderQty, setOrderQty] = useState<number>(100);
  const [placing, setPlacing] = useState(false);

  const { data: providers } = useQuery({
    queryKey: ["user-providers-list", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("user_provider_accounts").select("id, name").eq("is_active", true);
      return data || [];
    },
  });

  const { data: services, isLoading } = useQuery({
    queryKey: ["user-services", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_services").select("*").order("category").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const categories = useMemo(() => {
    const set = new Set<string>();
    (services || []).forEach((s: any) => s.category && set.add(s.category));
    return Array.from(set).sort();
  }, [services]);

  const filtered = useMemo(() => {
    return (services || []).filter((s: any) => {
      if (category !== "all" && s.category !== category) return false;
      if (search && !`${s.name} ${s.provider_service_id}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [services, category, search]);

  const handleImport = async () => {
    if (!importProvider) { toast.error("Provider select karo"); return; }
    setImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("user-import-services", {
        body: { providerAccountId: importProvider, markupPercent: markup },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast.success(`${data.imported} services imported`);
      qc.invalidateQueries({ queryKey: ["user-services"] });
    } catch (e: any) {
      toast.error(e.message || "Import failed");
    } finally { setImporting(false); }
  };

  const toggleActive = useMutation({
    mutationFn: async (svc: any) => {
      const { error } = await supabase.from("user_services").update({ is_active: !svc.is_active }).eq("id", svc.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user-services"] }),
  });

  const deleteService = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Service removed");
      qc.invalidateQueries({ queryKey: ["user-services"] });
    },
  });

  const placeOrder = async () => {
    if (!orderSvc) return;
    setPlacing(true);
    try {
      const { data, error } = await supabase.functions.invoke("user-place-order", {
        body: { userServiceId: orderSvc.id, link: orderLink.trim(), quantity: Number(orderQty) },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast.success(`Order placed! Provider order ID: ${data.providerOrderId}`);
      setOrderSvc(null); setOrderLink(""); setOrderQty(100);
    } catch (e: any) {
      toast.error(e.message || "Order failed");
    } finally { setPlacing(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Services</h1>
        <p className="text-sm text-muted-foreground mt-1">Apne provider se services import karo aur orders place karo.</p>
      </div>

      <Card className="p-6">
        <h2 className="font-semibold mb-4">Import Services from Provider</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <Label>Provider</Label>
            <Select value={importProvider} onValueChange={setImportProvider}>
              <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
              <SelectContent>
                {(providers || []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Markup % (your profit)</Label>
            <Input type="number" min={0} value={markup} onChange={(e) => setMarkup(Number(e.target.value))} />
          </div>
          <div className="flex items-end">
            <Button onClick={handleImport} disabled={importing || !importProvider} className="w-full">
              {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              Import Services
            </Button>
          </div>
        </div>
        {(providers || []).length === 0 && (
          <p className="text-xs text-muted-foreground mt-3">Pehle <a href="/my-providers" className="text-primary underline">My Providers</a> me API add karo.</p>
        )}
      </Card>

      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search services..." className="pl-9" />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : filtered.length > 0 ? (
        <div className="grid gap-2">
          {filtered.map((s: any) => (
            <Card key={s.id} className="p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10px] text-muted-foreground">#{s.provider_service_id}</span>
                    <Badge variant="outline" className="text-[10px]">{s.category}</Badge>
                    {!s.is_active && <Badge variant="secondary" className="text-[10px]">Disabled</Badge>}
                  </div>
                  <p className="font-medium text-sm mt-1 truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    ${Number(s.price).toFixed(4)} / 1k • Min {s.min_quantity} • Max {s.max_quantity}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setOrderSvc(s)} disabled={!s.is_active}>
                    <ShoppingCart className="w-3.5 h-3.5 mr-1" /> Order
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toggleActive.mutate(s)}>
                    {s.is_active ? "Disable" : "Enable"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete?")) deleteService.mutate(s.id); }}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center text-muted-foreground">
          Koi service nahi mili. Upar Import button se import karo.
        </Card>
      )}

      {/* Quick Order dialog */}
      {orderSvc && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setOrderSvc(null)}>
          <Card className="p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-3">Place Order</h3>
            <p className="text-xs text-muted-foreground mb-4 truncate">{orderSvc.name}</p>
            <div className="space-y-3">
              <div>
                <Label>Link</Label>
                <Input value={orderLink} onChange={(e) => setOrderLink(e.target.value)} placeholder="https://..." />
              </div>
              <div>
                <Label>Quantity (min {orderSvc.min_quantity} / max {orderSvc.max_quantity})</Label>
                <Input type="number" value={orderQty} onChange={(e) => setOrderQty(Number(e.target.value))} />
              </div>
              <p className="text-xs text-muted-foreground">
                Estimated cost: ${(Number(orderSvc.price) * orderQty / 1000).toFixed(4)} (from your provider balance)
              </p>
              <div className="flex gap-2 pt-2">
                <Button onClick={placeOrder} disabled={!orderLink || !orderQty || placing} className="flex-1">
                  {placing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Place Order
                </Button>
                <Button variant="ghost" onClick={() => setOrderSvc(null)}>Cancel</Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
