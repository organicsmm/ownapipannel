import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SubscriptionGuard } from "@/components/subscription/SubscriptionGuard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Rocket, Link as LinkIcon, Package } from "lucide-react";

export default function UserEngagementOrder() {
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
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [bundleId, setBundleId] = useState<string>("");
  const [link, setLink] = useState("");
  const [baseQuantity, setBaseQuantity] = useState(1000);
  const [organic, setOrganic] = useState(true);
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [ratios, setRatios] = useState<Record<string, number>>({});

  const { data: bundles, isLoading } = useQuery({
    queryKey: ["user-bundles-with-items", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_bundles")
        .select("*, user_bundle_items(*, user_provider_accounts(id, name, is_active))")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const bundle = useMemo(() => bundles?.find((b: any) => b.id === bundleId), [bundles, bundleId]);
  const items = bundle?.user_bundle_items || [];

  // Initialize ratios/enabled when bundle changes
  useMemo(() => {
    if (!items.length) return;
    const e: Record<string, boolean> = {};
    const r: Record<string, number> = {};
    items.forEach((it: any) => {
      e[it.id] = true;
      r[it.id] = Number(it.ratio_percent || 100);
    });
    setEnabled(e);
    setRatios(r);
  }, [bundleId]);

  const calc = useMemo(() => {
    return items.map((it: any) => {
      const ratio = ratios[it.id] ?? Number(it.ratio_percent || 100);
      const qty = Math.round(baseQuantity * (ratio / 100));
      const rate = Number(it.rate || 0);
      const price = (qty / 1000) * rate;
      return { it, qty, price, ratio, enabled: enabled[it.id] !== false };
    });
  }, [items, baseQuantity, ratios, enabled]);

  const totalPrice = calc.filter(c => c.enabled).reduce((s, c) => s + c.price, 0);
  const totalQty = calc.filter(c => c.enabled).reduce((s, c) => s + c.qty, 0);

  const place = useMutation({
    mutationFn: async () => {
      if (!bundle) throw new Error("Bundle select karo");
      if (!link.trim()) throw new Error("Link enter karo");
      const payload = calc.filter(c => c.enabled).map(c => ({
        user_bundle_item_id: c.it.id,
        engagement_type: c.it.engagement_type,
        quantity: c.qty,
        price: c.price,
      }));
      if (payload.length === 0) throw new Error("Koi engagement type enabled nahi hai");

      const { data, error } = await supabase.functions.invoke("user-process-engagement-order", {
        body: {
          user_bundle_id: bundle.id,
          link: link.trim(),
          base_quantity: baseQuantity,
          is_organic_mode: organic,
          items: payload,
        },
      });
      if (error) {
        let msg = error.message || "Order failed";
        try {
          const text = await (error as any)?.context?.text?.();
          if (text) { try { msg = JSON.parse(text).error || text; } catch { msg = text; } }
        } catch { /* ignore */ }
        throw new Error(msg);
      }
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: (data: any) => {
      toast({ title: "🚀 Order placed!", description: `Order #${data.order_number} aapke provider par bhej diya gaya.` });
      qc.invalidateQueries({ queryKey: ["engagement-orders"] });
      navigate("/engagement-orders");
    },
    onError: (e: Error) => toast({ title: "Order failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="max-w-4xl mx-auto px-4 space-y-5 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Full Engagement Order</h1>
        <p className="text-sm text-muted-foreground mt-1">Apne bundle se directly apne provider par order bhejo. Paise aapke provider balance se hi kategi.</p>
      </div>

      <Card>
        <CardContent className="p-5 space-y-4">
          <div>
            <Label>Apna Bundle</Label>
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-3"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
            ) : !bundles || bundles.length === 0 ? (
              <div className="p-4 bg-muted/30 rounded-md text-sm">
                Pehle <a href="/my-bundles" className="underline text-primary">My Bundles</a> page se ek bundle banao.
              </div>
            ) : (
              <Select value={bundleId} onValueChange={setBundleId}>
                <SelectTrigger><SelectValue placeholder="Select bundle" /></SelectTrigger>
                <SelectContent>
                  {bundles.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} <span className="text-muted-foreground text-xs ml-1">({b.platform} • {b.user_bundle_items?.length || 0} items)</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div>
            <Label className="flex items-center gap-2"><LinkIcon className="w-4 h-4" /> Link</Label>
            <Input placeholder="https://..." value={link} onChange={(e) => setLink(e.target.value)} />
          </div>

          <div>
            <Label>Base Quantity</Label>
            <Input type="number" value={baseQuantity} min={1} onChange={(e) => setBaseQuantity(Math.max(1, Number(e.target.value) || 0))} />
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={organic} onCheckedChange={setOrganic} />
            <Label className="cursor-pointer" onClick={() => setOrganic(!organic)}>Organic Mode (slow natural delivery)</Label>
          </div>
        </CardContent>
      </Card>

      {bundle && items.length > 0 && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2"><Package className="w-4 h-4" /> Breakdown</h3>
            {calc.map(({ it, qty, price, ratio, enabled: en }) => {
              const min = Number(it.min_qty || 0), max = Number(it.max_qty || 0);
              const belowMin = min > 0 && qty < min;
              const aboveMax = max > 0 && qty > max;
              return (
                <div key={it.id} className="border border-border rounded-md p-3 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Switch checked={en} onCheckedChange={(v) => setEnabled(prev => ({ ...prev, [it.id]: v }))} />
                      <Badge className="capitalize">{it.engagement_type}</Badge>
                      <span className="text-xs text-muted-foreground truncate max-w-[260px]">{it.service_name || "service"} • #{it.provider_service_id}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">{qty.toLocaleString()} qty</div>
                      <div className="text-xs text-muted-foreground">${price.toFixed(4)} @ ${Number(it.rate || 0).toFixed(4)}/1k</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Ratio %</Label>
                    <Input
                      type="number"
                      className="h-8 w-24"
                      value={ratio}
                      onChange={(e) => setRatios(prev => ({ ...prev, [it.id]: Math.max(0, Number(e.target.value) || 0) }))}
                    />
                    {belowMin && <span className="text-xs text-destructive">below min {min}</span>}
                    {aboveMax && <span className="text-xs text-destructive">above max {max}</span>}
                    {it.user_provider_accounts?.is_active === false && <span className="text-xs text-destructive">provider inactive</span>}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Card className="border-2 border-primary/40">
        <CardContent className="p-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-2xl font-bold text-primary">${totalPrice.toFixed(4)}</div>
            <div className="text-xs text-muted-foreground">{totalQty.toLocaleString()} engagements • provider balance se katenge</div>
          </div>
          <Button
            size="lg"
            disabled={!bundle || !link.trim() || place.isPending || totalQty === 0}
            onClick={() => place.mutate()}
          >
            {place.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Placing...</> : <><Rocket className="w-4 h-4 mr-2" /> Place Order</>}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
