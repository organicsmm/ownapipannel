import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SubscriptionGuard } from "@/components/subscription/SubscriptionGuard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Rocket, Link as LinkIcon, Package, Trash2, Pencil, CheckCircle2, XCircle, AlertCircle,
} from "lucide-react";
import {
  EngagementType, DEFAULT_RATIOS, ENGAGEMENT_CONFIG,
} from "@/lib/engagement-types";

const PREFERRED_ORDER: Record<string, number> = {
  views: 1, likes: 2, comments: 3, shares: 4, reposts: 5, saves: 6, followers: 7, subscribers: 8, retweets: 9, watch_hours: 10,
};

const TIMEFRAMES = [
  { value: 24, label: "Under 24 hours" },
  { value: 72, label: "1-3 days" },
  { value: 168, label: "3-7 days" },
  { value: 336, label: "7-14 days" },
  { value: 0, label: "Auto (smart)" },
];

interface OrderRow {
  id: string;
  link: string;
  baseQuantity: number;
  timeLimitHours: number;
  enabledTypes: Record<EngagementType, boolean>;
  // submit state
  status: "idle" | "submitting" | "success" | "failed";
  message?: string;
  orderNumber?: number;
}

function uid() { return Math.random().toString(36).slice(2, 10); }

function isValidUrl(s: string) {
  try {
    const u = new URL(s.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch { return false; }
}

export default function MassOrder() {
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

  const [bundleId, setBundleId] = useState<string>("");
  const [linksText, setLinksText] = useState("");
  const [defaultBaseQty, setDefaultBaseQty] = useState(10000);
  const [defaultTimeframe, setDefaultTimeframe] = useState<number>(24);
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: bundles, isLoading } = useQuery({
    queryKey: ["user-bundles-with-items", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_bundles")
        .select("*, user_bundle_items(*, user_provider_accounts(id, name, is_active))")
        .eq("user_id", user!.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (!bundleId && bundles && bundles.length > 0) setBundleId(bundles[0].id);
  }, [bundles, bundleId]);

  const bundle = useMemo(() => bundles?.find((b: any) => b.id === bundleId), [bundles, bundleId]);
  const items = bundle?.user_bundle_items || [];

  const activeTypes = useMemo<EngagementType[]>(() => {
    const types = items
      .filter((it: any) => it.provider_service_id)
      .map((it: any) => it.engagement_type as EngagementType);
    return [...new Set<EngagementType>(types)].sort(
      (a, b) => (PREFERRED_ORDER[a] || 99) - (PREFERRED_ORDER[b] || 99)
    );
  }, [items]);

  const itemByType = useMemo(() => {
    const m: Record<string, any> = {};
    items.forEach((it: any) => { if (!m[it.engagement_type]) m[it.engagement_type] = it; });
    return m;
  }, [items]);

  // Parse links from textarea → build/sync rows
  useEffect(() => {
    const lines = linksText.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const unique: string[] = [];
    const seen = new Set<string>();
    for (const l of lines) { if (!seen.has(l)) { seen.add(l); unique.push(l); } }

    setRows((prev) => {
      const prevByLink = new Map(prev.map(r => [r.link, r]));
      return unique.map((l) => {
        const existing = prevByLink.get(l);
        if (existing) return existing;
        const enabled: Record<string, boolean> = {};
        activeTypes.forEach(t => { enabled[t] = true; });
        return {
          id: uid(),
          link: l,
          baseQuantity: defaultBaseQty,
          timeLimitHours: defaultTimeframe,
          enabledTypes: enabled as Record<EngagementType, boolean>,
          status: "idle" as const,
        };
      });
    });
  }, [linksText, activeTypes.join(","), defaultBaseQty, defaultTimeframe]);

  // Compute per-row totals
  function computeRowTotals(r: OrderRow) {
    const breakdown: { type: EngagementType; qty: number; price: number }[] = [];
    let totalPrice = 0;
    let totalQty = 0;
    activeTypes.forEach((type) => {
      if (!r.enabledTypes[type]) return;
      const item = itemByType[type];
      if (!item) return;
      const ratio = DEFAULT_RATIOS[type] ?? 100;
      const isBase = type === "views" || item.is_base;
      const minQty = Number(item.min_qty || 0) || 1;
      const raw = isBase ? r.baseQuantity : Math.round(r.baseQuantity * (ratio / 100));
      const qty = Math.max(minQty, raw);
      const rate = Number(item.rate || 0);
      const price = (qty / 1000) * rate;
      breakdown.push({ type, qty, price });
      totalPrice += price;
      totalQty += qty;
    });
    return { breakdown, totalPrice, totalQty };
  }

  const grandTotal = useMemo(
    () => rows.reduce((s, r) => s + computeRowTotals(r).totalPrice, 0),
    [rows, activeTypes, itemByType]
  );

  // Validation
  const invalidLines = useMemo(() => {
    const lines = linksText.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    return lines.filter(l => !isValidUrl(l));
  }, [linksText]);

  const duplicates = useMemo(() => {
    const lines = linksText.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const counts: Record<string, number> = {};
    lines.forEach(l => { counts[l] = (counts[l] || 0) + 1; });
    return Object.entries(counts).filter(([, c]) => c > 1).map(([l]) => l);
  }, [linksText]);

  const canSubmit = !submitting
    && !!bundle
    && activeTypes.length > 0
    && rows.length > 0
    && invalidLines.length === 0
    && defaultBaseQty > 0;

  const removeRow = useCallback((id: string) => {
    const row = rows.find(r => r.id === id);
    if (!row) return;
    setRows(prev => prev.filter(r => r.id !== id));
    setLinksText(prev => prev.split(/\r?\n/).filter(l => l.trim() !== row.link).join("\n"));
  }, [rows]);

  const updateRow = useCallback((id: string, patch: Partial<OrderRow>) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  }, []);

  async function handleSubmitAll() {
    if (!canSubmit || !bundle) return;
    setSubmitting(true);
    let ok = 0, fail = 0;
    // Sequential to avoid overwhelming providers
    for (const r of rows) {
      updateRow(r.id, { status: "submitting", message: undefined });
      try {
        const enabled = activeTypes.filter(t => r.enabledTypes[t]);
        if (enabled.length === 0) throw new Error("No engagement type enabled");
        const totals = computeRowTotals(r);
        const payload = enabled.map((type) => {
          const item = itemByType[type];
          const bd = totals.breakdown.find(b => b.type === type)!;
          return {
            user_bundle_item_id: item.id,
            engagement_type: type,
            quantity: bd.qty,
            price: bd.price,
            time_limit_hours: r.timeLimitHours,
            variance_percent: 25,
            peak_hours_enabled: false,
          };
        });

        const { data, error } = await supabase.functions.invoke("user-process-engagement-order", {
          body: {
            user_bundle_id: bundle.id,
            link: r.link,
            base_quantity: r.baseQuantity,
            is_organic_mode: true,
            items: payload,
          },
        });
        if (error) {
          let msg = error.message || "Failed";
          try {
            const text = await (error as any)?.context?.text?.();
            if (text) { try { msg = JSON.parse(text).error || text; } catch { msg = text; } }
          } catch { /* ignore */ }
          throw new Error(msg);
        }
        if ((data as any)?.error) throw new Error((data as any).error);
        ok++;
        updateRow(r.id, {
          status: "success",
          orderNumber: (data as any)?.order_number,
          message: `Order #${(data as any)?.order_number}`,
        });
      } catch (e: any) {
        fail++;
        updateRow(r.id, { status: "failed", message: e?.message || "Failed" });
      }
      // tiny stagger
      await new Promise(res => setTimeout(res, 250));
    }
    setSubmitting(false);
    toast({
      title: fail === 0 ? "🚀 All orders submitted" : "Submitted with some failures",
      description: `${ok} success, ${fail} failed`,
      variant: fail === 0 ? "default" : "destructive",
    });
    if (fail === 0) {
      setTimeout(() => navigate("/engagement-orders"), 1200);
    }
  }

  const editingRow = rows.find(r => r.id === editingId) || null;

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-6 lg:px-8 space-y-4 sm:space-y-6 pb-10">
      {/* Hero */}
      <Card className="glass-card border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-transparent to-primary/5">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <Rocket className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-foreground">
                Mass Order — Bulk Engagement
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                Ek hi page se multiple links par engagement order place karo. Bundle select karo, default settings set karo,
                phir har link ko alag se customize karke ek click me submit karo.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bundle */}
      <Card className="glass-card border-2 border-border">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-foreground/10 flex items-center justify-center">
              <Package className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <Label className="text-base sm:text-lg font-bold">Apna Bundle</Label>
          </div>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
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
          {bundle && activeTypes.length === 0 && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> Is bundle me koi linked service nahi hai.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Links + defaults */}
      <Card className="glass-card border-2 border-border">
        <CardContent className="p-4 sm:p-6 space-y-5">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-foreground/10 flex items-center justify-center">
              <LinkIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <Label className="text-base sm:text-lg font-bold">Links (har line par ek)</Label>
          </div>
          <Textarea
            placeholder={`https://instagram.com/p/abc\nhttps://instagram.com/p/xyz\nhttps://youtube.com/watch?v=...`}
            value={linksText}
            onChange={(e) => setLinksText(e.target.value)}
            className="min-h-[140px] font-mono text-sm"
          />
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <span className="text-muted-foreground">{rows.length} valid link(s)</span>
            {invalidLines.length > 0 && <span className="text-destructive">{invalidLines.length} invalid URL</span>}
            {duplicates.length > 0 && <span className="text-yellow-600">{duplicates.length} duplicate(s) auto-removed</span>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Default Base Quantity (views)</Label>
              <Input
                type="number" min={1}
                value={defaultBaseQty}
                onChange={(e) => setDefaultBaseQty(Math.max(1, Number(e.target.value) || 0))}
                className="h-12 text-base font-semibold"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Default Timeframe</Label>
              <Select value={String(defaultTimeframe)} onValueChange={(v) => setDefaultTimeframe(Number(v))}>
                <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIMEFRAMES.map(tf => (
                    <SelectItem key={tf.value} value={String(tf.value)}>{tf.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Defaults sirf naye links par apply hote hain. Existing rows ko edit karke per-link override karo.
          </p>
        </CardContent>
      </Card>

      {/* Preview cards */}
      {rows.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg sm:text-xl font-bold">Preview ({rows.length})</h2>
            <span className="text-sm font-bold bg-foreground text-background px-3 py-1.5 rounded-lg">
              Total: ₹{grandTotal.toFixed(2)}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {rows.map((r) => {
              const t = computeRowTotals(r);
              return (
                <Card key={r.id} className="border-2 border-border hover:border-primary/40 transition-colors">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Link</div>
                        <div className="text-sm font-mono truncate" title={r.link}>{r.link}</div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {r.status === "submitting" && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                        {r.status === "success" && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                        {r.status === "failed" && <XCircle className="w-4 h-4 text-destructive" />}
                        <Button size="icon" variant="ghost" className="h-8 w-8" disabled={submitting} onClick={() => setEditingId(r.id)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-destructive" disabled={submitting} onClick={() => removeRow(r.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                      {t.breakdown.length === 0 && (
                        <div className="col-span-2 text-muted-foreground">No engagement type enabled</div>
                      )}
                      {t.breakdown.map(b => (
                        <div key={b.type} className="flex items-center gap-1.5">
                          <span>{ENGAGEMENT_CONFIG[b.type]?.emoji}</span>
                          <span className="capitalize text-muted-foreground">{b.type}:</span>
                          <span className="font-semibold">{b.qty.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-border">
                      <span className="text-muted-foreground">
                        ⏱ {TIMEFRAMES.find(tf => tf.value === r.timeLimitHours)?.label || `${r.timeLimitHours}h`}
                      </span>
                      <span className="font-bold">₹{t.totalPrice.toFixed(2)}</span>
                    </div>
                    {r.message && (
                      <div className={`text-[11px] ${r.status === "failed" ? "text-destructive" : "text-green-600"}`}>
                        {r.message}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Submit */}
      <Card className="glass-card border-2 border-primary/40 bg-gradient-to-br from-primary/5 via-transparent to-primary/10">
        <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            {rows.length} order(s) ready • Total <span className="font-bold text-foreground">₹{grandTotal.toFixed(2)}</span>
          </div>
          <Button
            size="lg"
            disabled={!canSubmit}
            onClick={handleSubmitAll}
            className="w-full sm:w-auto min-w-[200px]"
          >
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Submitting...</> : <><Rocket className="w-4 h-4 mr-2" /> Submit All Orders</>}
          </Button>
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={!!editingRow} onOpenChange={(o) => !o && setEditingId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Order</DialogTitle>
          </DialogHeader>
          {editingRow && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Link</Label>
                <Input value={editingRow.link} onChange={(e) => updateRow(editingRow.id, { link: e.target.value })} className="h-11 font-mono text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Base Quantity</Label>
                  <Input type="number" min={1} value={editingRow.baseQuantity}
                    onChange={(e) => updateRow(editingRow.id, { baseQuantity: Math.max(1, Number(e.target.value) || 0) })}
                    className="h-11 font-semibold" />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Timeframe</Label>
                  <Select value={String(editingRow.timeLimitHours)} onValueChange={(v) => updateRow(editingRow.id, { timeLimitHours: Number(v) })}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIMEFRAMES.map(tf => <SelectItem key={tf.value} value={String(tf.value)}>{tf.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Engagement Types</Label>
                <div className="grid grid-cols-2 gap-2">
                  {activeTypes.map((type) => (
                    <label key={type} className="flex items-center gap-2 px-3 py-2 border border-border rounded-md cursor-pointer hover:bg-muted/40">
                      <input
                        type="checkbox"
                        checked={editingRow.enabledTypes[type] ?? false}
                        onChange={(e) => updateRow(editingRow.id, {
                          enabledTypes: { ...editingRow.enabledTypes, [type]: e.target.checked },
                        })}
                      />
                      <span className="text-sm capitalize">{ENGAGEMENT_CONFIG[type]?.emoji} {type}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="bg-muted/30 rounded-md p-3 text-xs space-y-1">
                {computeRowTotals(editingRow).breakdown.map(b => (
                  <div key={b.type} className="flex justify-between">
                    <span className="capitalize text-muted-foreground">{b.type}</span>
                    <span className="font-semibold">{b.qty.toLocaleString()} · ₹{b.price.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-1 border-t border-border font-bold">
                  <span>Total</span>
                  <span>₹{computeRowTotals(editingRow).totalPrice.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
            <Button onClick={() => setEditingId(null)}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
