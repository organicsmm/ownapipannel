import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SubscriptionGuard } from "@/components/subscription/SubscriptionGuard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Rocket, Link as LinkIcon, Package } from "lucide-react";
import {
  EngagementType,
  EngagementConfig,
  DEFAULT_RATIOS,
  DEFAULT_ORGANIC_SETTINGS,
} from "@/lib/engagement-types";
import { QuantitySelector } from "@/components/engagement/QuantitySelector";
import { EngagementTypeCard } from "@/components/engagement/EngagementTypeCard";

import { LiveGrowthChart } from "@/components/engagement/LiveGrowthChart";
import { useDebounce } from "@/hooks/useDebounce";

type EngagementConfigs = Record<string, EngagementConfig>;

const PREFERRED_ORDER: Record<string, number> = {
  views: 1, likes: 2, comments: 3, shares: 4, reposts: 5, saves: 6, followers: 7, subscribers: 8, retweets: 9, watch_hours: 10,
};

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
  const [baseQuantity, setBaseQuantity] = useState(10000);
  const debouncedBase = useDebounce(baseQuantity, 200);
  const [engagements, setEngagements] = useState<EngagementConfigs>({});
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0);

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
    placeholderData: keepPreviousData,
  });

  // Auto-select first bundle
  useEffect(() => {
    if (!bundleId && bundles && bundles.length > 0) setBundleId(bundles[0].id);
  }, [bundles, bundleId]);

  const bundle = useMemo(() => bundles?.find((b: any) => b.id === bundleId), [bundles, bundleId]);
  const platform = (bundle?.platform || "instagram") as 'instagram' | 'tiktok' | 'youtube' | 'twitter' | 'facebook';
  const items = bundle?.user_bundle_items || [];

  const activeEngagementTypes = useMemo<EngagementType[]>(() => {
    const types = items
      .filter((it: any) => it.provider_service_id) // only linked items
      .map((it: any) => it.engagement_type as EngagementType);
    return [...new Set<EngagementType>(types)].sort((a, b) => (PREFERRED_ORDER[a] || 99) - (PREFERRED_ORDER[b] || 99));
  }, [items]);

  // Build per-type config from bundle items when bundle / quantity changes
  useEffect(() => {
    if (!bundle) { setEngagements({}); return; }
    setEngagements((prev) => {
      const next: EngagementConfigs = {};
      activeEngagementTypes.forEach((type) => {
        const item = items.find((it: any) => it.engagement_type === type);
        if (!item) return;
        const ratio = DEFAULT_RATIOS[type] ?? 100;
        const isBase = type === "views" || item.is_base;
        const qty = isBase ? debouncedBase : Math.max(1, Math.round(debouncedBase * (ratio / 100)));
        const rate = Number(item.rate || 0);
        const price = (qty / 1000) * rate;
        next[type] = {
          type,
          enabled: prev[type]?.enabled ?? true,
          quantity: prev[type]?.quantity && !isBase ? prev[type].quantity : qty,
          price: prev[type]?.quantity && !isBase ? (prev[type].quantity / 1000) * rate : price,
          serviceId: item.id, // we send user_bundle_item_id as identifier
          minQuantity: Number(item.min_qty || 0) || undefined,
          timeLimitHours: prev[type]?.timeLimitHours ?? DEFAULT_ORGANIC_SETTINGS.timeLimitHours,
          variancePercent: prev[type]?.variancePercent ?? DEFAULT_ORGANIC_SETTINGS.variancePercent,
          peakHoursEnabled: prev[type]?.peakHoursEnabled ?? DEFAULT_ORGANIC_SETTINGS.peakHoursEnabled,
        };
      });
      return next;
    });
  }, [bundle?.id, debouncedBase, activeEngagementTypes.join(",")]);

  const handleEngagementChange = useCallback((type: EngagementType, config: EngagementConfig) => {
    setEngagements(prev => ({ ...prev, [type]: config }));
  }, []);

  const pricePerKMap = useMemo(() => {
    const m: Record<string, number> = {};
    items.forEach((it: any) => { m[it.engagement_type] = Number(it.rate || 0); });
    return m;
  }, [items]);

  const totalPrice = useMemo(
    () => Object.values(engagements).filter(e => e.enabled).reduce((s, e) => s + e.price, 0),
    [engagements]
  );
  const totalQty = useMemo(
    () => Object.values(engagements).filter(e => e.enabled).reduce((s, e) => s + e.quantity, 0),
    [engagements]
  );

  const place = useMutation({
    mutationFn: async () => {
      if (!bundle) throw new Error("Select a bundle");
      if (!link.trim()) throw new Error("Enter link");
      const enabled = Object.entries(engagements).filter(([_, c]) => c.enabled);
      if (enabled.length === 0) throw new Error("Enable at least one engagement type");

      const payload = enabled.map(([type, c]) => {
        const item = items.find((it: any) => it.engagement_type === type);
        let tl = c.timeLimitHours; if (tl === -1) tl = 0;
        return {
          user_bundle_item_id: item?.id,
          engagement_type: type,
          quantity: c.quantity,
          price: c.price,
          time_limit_hours: tl,
          variance_percent: c.variancePercent,
          peak_hours_enabled: c.peakHoursEnabled,
        };
      });

      const { data, error } = await supabase.functions.invoke("user-process-engagement-order", {
        body: {
          user_bundle_id: bundle.id,
          link: link.trim(),
          base_quantity: baseQuantity,
          is_organic_mode: true,
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
      toast({ title: "🚀 Order placed!", description: `Order #${data.order_number} provider par bhej diya gaya.` });
      qc.invalidateQueries({ queryKey: ["engagement-orders"] });
      navigate("/engagement-orders");
    },
    onError: (e: Error) => toast({ title: "Order failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="max-w-5xl mx-auto px-2 sm:px-6 lg:px-8 space-y-3 sm:space-y-6 pb-8">
      {/* Bundle Selector */}
      <Card className="glass-card border-2 border-border">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-foreground/10 flex items-center justify-center">
              <Package className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
            </div>
            <Label className="text-base sm:text-lg font-bold tracking-tight text-foreground">Apna Bundle</Label>
          </div>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-3"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
          ) : !bundles || bundles.length === 0 ? (
            <div className="p-4 bg-muted/30 rounded-md text-sm">
              Pehle <a href="/my-bundles" className="underline text-primary">My Bundles</a> page se ek bundle banao.
            </div>
          ) : (
            <Select value={bundleId} onValueChange={setBundleId}>
              <SelectTrigger className="h-12"><SelectValue placeholder="Select bundle" /></SelectTrigger>
              <SelectContent>
                {bundles.map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name} <span className="text-muted-foreground text-xs ml-1">({b.platform} • {b.user_bundle_items?.length || 0} items)</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {/* Link */}
      <Card className="glass-card border-2 border-border">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-foreground/10 flex items-center justify-center">
              <LinkIcon className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
            </div>
            <Label className="text-base sm:text-lg font-bold tracking-tight text-foreground">Video/Post Link</Label>
          </div>
          <Input
            placeholder={`https://${platform}.com/...`}
            value={link}
            onChange={(e) => setLink(e.target.value)}
            className="h-12 sm:h-14 text-base sm:text-lg rounded-xl border-2 border-border focus:border-foreground bg-secondary text-foreground font-medium"
          />
        </CardContent>
      </Card>

      {/* Base Quantity */}
      <Card className="glass-card border-2 border-border">
        <CardContent className="p-4 sm:p-6">
          <QuantitySelector
            value={baseQuantity}
            onChange={setBaseQuantity}
            min={100}
            max={10000000}
          />
        </CardContent>
      </Card>

      {/* Engagement Breakdown */}
      <div className="space-y-4 sm:space-y-5">
        <div className="flex items-center justify-between px-1 gap-2">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">Engagement Breakdown</h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 hidden sm:block">
              Customize organic settings per type
            </p>
          </div>
          <span className="text-xs sm:text-sm bg-foreground text-background px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-bold shrink-0">
            {Object.values(engagements).filter(e => e.enabled).length} active
          </span>
        </div>

        {activeEngagementTypes.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              Is bundle me koi linked service nahi hai. <a href="/my-bundles" className="underline text-primary">My Bundles</a> page se service ID link karo.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:gap-4">
            {activeEngagementTypes.map((type) => (
              engagements[type] && (
                <EngagementTypeCard
                  key={type}
                  type={type}
                  config={engagements[type]}
                  baseQuantity={baseQuantity}
                  onChange={(config) => handleEngagementChange(type, config)}
                  minQuantity={engagements[type]?.minQuantity}
                  pricePerK={pricePerKMap[type]}
                />
              )
            ))}
          </div>
        )}
      </div>




      {/* Place Order */}
      <Card className="glass-card border-2 border-primary/40 bg-gradient-to-br from-primary/5 via-transparent to-primary/10">
        <CardContent className="p-4 sm:p-6 flex justify-center">
          <Button
            size="lg"
            onClick={() => place.mutate()}
            disabled={!bundle || !link.trim() || place.isPending || totalQty === 0}
            className="w-full sm:w-auto h-12 sm:h-14 px-8 sm:px-12 text-base sm:text-lg font-bold rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25"
          >
            {place.isPending ? (
              <><Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin mr-2" /> Processing...</>
            ) : (
              <><Rocket className="h-4 w-4 sm:h-5 sm:w-5 mr-2" /> Place Order</>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
