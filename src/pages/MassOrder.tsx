import { lazy, Suspense, useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { useQuery, keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Rocket, Link as LinkIcon, Package, Trash2, Pencil, CheckCircle2, XCircle, AlertCircle,
  Upload, Download, History, FileText, Clock, CalendarClock, Play,
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

const SubscriptionCheckDialog = lazy(() =>
  import("@/components/subscription/SubscriptionCheckDialog").then((m) => ({ default: m.SubscriptionCheckDialog }))
);

interface OrderRow {
  id: string;
  link: string;
  baseQuantity: number;
  timeLimitHours: number;
  enabledTypes: Record<EngagementType, boolean>;
  /** Per-type quantity overrides. If set for a type, used instead of ratio-based calc. */
  qtyOverrides?: Partial<Record<EngagementType, number>>;
  /** Variations (organic delivery tuning) — global defaults se aate hain, per-row override possible. */
  variancePercent: number;        // 10-50 (%)
  peakHoursEnabled: boolean;
  /** Manual-edit flags — when true, defaults won't overwrite this row's field. */
  manualBase?: boolean;
  manualTimeframe?: boolean;
  manualVariance?: boolean;
  manualPeak?: boolean;
  manualTypes?: Partial<Record<EngagementType, boolean>>;
  status: "idle" | "submitting" | "success" | "failed";
  message?: string;
  orderNumber?: number;
  orderId?: string;
  price?: number;
}

function uid() { return Math.random().toString(36).slice(2, 10); }

function isValidUrl(s: string) {
  try {
    const u = new URL(s.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch { return false; }
}

// Map common type aliases (singular/plural/short forms) → canonical EngagementType
const TYPE_ALIASES: Record<string, EngagementType> = {
  l: "likes", lk: "likes", like: "likes", likes: "likes",
  v: "views", vw: "views", view: "views", views: "views", reelview: "views", reelviews: "views", storyview: "views", storyviews: "views",
  sh: "shares", share: "shares", shares: "shares",
  c: "comments", cm: "comments", comment: "comments", comments: "comments",
  f: "followers", fl: "followers", follower: "followers", followers: "followers", follow: "followers", follows: "followers",
  sv: "saves", save: "saves", saves: "saves",
  rp: "reposts", repost: "reposts", reposts: "reposts",
  rt: "retweets", retweet: "retweets", retweets: "retweets",
  sub: "subscribers", subs: "subscribers", subscriber: "subscribers", subscribers: "subscribers",
  wh: "watch_hours", watchhour: "watch_hours", watchhours: "watch_hours", watch_hours: "watch_hours",
};

export interface ParsedLink {
  url: string;
  baseQty?: number;
  perTypeQty?: Partial<Record<EngagementType, number>>;
}

// Smart parser: supports plain URLs, "URL | Type | Qty", "URL,Type,Qty",
// "URL | likes:1000 | comments:50 | shares:30", "URL | 5000" (base qty only).
function parseLinksFromText(text: string): ParsedLink[] {
  const out: ParsedLink[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const parts = line.split(/[|,;\t]/).map((p) => p.trim().replace(/^"|"$/g, "")).filter(Boolean);
    const urlIdx = parts.findIndex((p) => /^https?:\/\//i.test(p));
    if (urlIdx === -1) continue;
    const url = parts[urlIdx];
    const rest = parts.filter((_, i) => i !== urlIdx);
    const parsed: ParsedLink = { url };
    const perType: Partial<Record<EngagementType, number>> = {};
    let pendingType: EngagementType | undefined;
    for (const tokRaw of rest) {
      const tok = tokRaw.trim();
      // "likes:1000" / "likes=1000"
      const kv = tok.match(/^([a-z_]+)\s*[:=]\s*(\d[\d_,]*)$/i);
      if (kv) {
        const t = TYPE_ALIASES[kv[1].toLowerCase().replace(/\s+/g, "")];
        const q = Number(kv[2].replace(/[_,]/g, ""));
        if (t && q > 0) perType[t] = q;
        pendingType = undefined;
        continue;
      }
      // Pure number
      if (/^\d[\d_,]*$/.test(tok)) {
        const q = Number(tok.replace(/[_,]/g, ""));
        if (pendingType) { perType[pendingType] = q; pendingType = undefined; }
        else if (parsed.baseQty == null) parsed.baseQty = q;
        continue;
      }
      // Pure type word — next number applies to it
      const t = TYPE_ALIASES[tok.toLowerCase().replace(/\s+/g, "")];
      if (t) { pendingType = t; }
    }
    if (Object.keys(perType).length > 0) parsed.perTypeQty = perType;
    out.push(parsed);
  }
  return out;
}


export default function MassOrder() {
  return (
    <DashboardLayout>
      <Inner />
    </DashboardLayout>
  );
}

function Inner() {
  const [tab, setTab] = useState<"create" | "history">("create");
  useScheduledBatchProcessor();
  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-6 lg:px-8 pb-10">
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="space-y-4">
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="create" className="gap-2"><Rocket className="w-4 h-4" /> Create</TabsTrigger>
          <TabsTrigger value="history" className="gap-2"><History className="w-4 h-4" /> Batches</TabsTrigger>
        </TabsList>
        <TabsContent value="create" className="space-y-4 sm:space-y-6 mt-0">
          <CreateMassOrder onSubmitted={() => setTab("history")} />
        </TabsContent>
        <TabsContent value="history" className="mt-0">
          <BatchHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ============================================================
   SCHEDULED BATCH PROCESSOR
   ----------------------------------------------------------------
   Polls every 30s for the current user's scheduled batches that are
   due (scheduled_at <= now). Atomically claims them and runs each
   row through the same edge function used by immediate submissions.
   Runs only while the Mass Order page is open. Multi-tab safe via
   the conditional UPDATE claim.
   ============================================================ */
function useScheduledBatchProcessor() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const runningRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function tick() {
      if (runningRef.current || cancelled) return;
      runningRef.current = true;
      try {
        const { data: due } = await supabase
          .from("mass_order_batches")
          .select("id, name, user_bundle_id, payload, scheduled_at")
          .eq("user_id", user!.id)
          .eq("status", "scheduled")
          .lte("scheduled_at", new Date().toISOString())
          .order("scheduled_at", { ascending: true })
          .limit(3);
        if (!due || due.length === 0 || cancelled) return;

        for (const batch of due) {
          // Atomic claim — only this tab/user wins the race
          const { data: claimed } = await supabase
            .from("mass_order_batches")
            .update({ status: "processing" })
            .eq("id", batch.id)
            .eq("status", "scheduled")
            .select("id")
            .maybeSingle();
          if (!claimed) continue;

          const payload = (batch.payload || {}) as any;
          const rowsArr: any[] = Array.isArray(payload.rows) ? payload.rows : [];
          if (rowsArr.length === 0) {
            await supabase.from("mass_order_batches")
              .update({ status: "failed", failed_count: 0 })
              .eq("id", batch.id);
            continue;
          }

          toast({
            title: "⏰ Scheduled batch started",
            description: `${batch.name || "Batch"} — submitting ${rowsArr.length} order(s)`,
          });

          let ok = 0, fail = 0;
          // Bounded concurrency = 4 (lower than UI loop to be polite in background)
          const CONCURRENCY = 4;
          const queue = [...rowsArr];

          async function processRow(row: any) {
            // Insert batch_item record first
            const { data: itemRow } = await supabase
              .from("mass_order_batch_items")
              .insert({
                batch_id: batch.id,
                user_id: user!.id,
                link: row.link,
                base_quantity: row.base_quantity,
                time_limit_hours: row.time_limit_hours,
                enabled_types: row.enabled_types as any,
                price: row.total_price,
                status: "pending",
              })
              .select("id")
              .single();
            const itemId = itemRow?.id as string | undefined;
            try {
              const { data, error } = await supabase.functions.invoke("user-process-engagement-order", {
                body: {
                  user_bundle_id: payload.bundle_id || batch.user_bundle_id,
                  link: row.link,
                  base_quantity: row.base_quantity,
                  is_organic_mode: true,
                  items: row.items,
                },
              });
              if (error) throw new Error(error.message || "Invoke failed");
              if ((data as any)?.error) throw new Error((data as any).error);
              ok++;
              if (itemId) {
                supabase.from("mass_order_batch_items").update({
                  status: "success",
                  engagement_order_id: (data as any)?.order_id ?? null,
                  engagement_order_number: (data as any)?.order_number ?? null,
                }).eq("id", itemId).then(() => {});
              }
            } catch (e: any) {
              fail++;
              if (itemId) {
                supabase.from("mass_order_batch_items").update({
                  status: "failed",
                  error_message: e?.message || "Failed",
                }).eq("id", itemId).then(() => {});
              }
            }
          }

          async function worker() {
            while (queue.length > 0 && !cancelled) {
              const r = queue.shift();
              if (!r) return;
              await processRow(r);
            }
          }
          await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, () => worker()));

          const finalStatus = fail === 0 ? "completed" : (ok === 0 ? "failed" : "partial");
          await supabase.from("mass_order_batches").update({
            success_count: ok,
            failed_count: fail,
            status: finalStatus,
          }).eq("id", batch.id);

          qc.invalidateQueries({ queryKey: ["mass-batches"] });
          toast({
            title: fail === 0 ? "✅ Scheduled batch done" : "⚠️ Scheduled batch finished with errors",
            description: `${batch.name || "Batch"}: ${ok} success, ${fail} failed`,
            variant: fail === 0 ? "default" : "destructive",
          });
        }
      } finally {
        runningRef.current = false;
      }
    }

    // First tick after 5s (let page settle), then every 30s
    const initial = window.setTimeout(tick, 5_000);
    const interval = window.setInterval(tick, 30_000);
    return () => {
      cancelled = true;
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [user, toast, qc]);
}

/* ============================================================
   CREATE
   ============================================================ */

function CreateMassOrder({ onSubmitted }: { onSubmitted: () => void }) {
  const { user, isAdmin } = useAuth();
  const { hasActiveSubscription, isLoading: subscriptionLoading } = useSubscription();
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [bundleId, setBundleId] = useState<string>("");
  const [batchName, setBatchName] = useState<string>("");
  const [linksText, setLinksText] = useState("");
  const [defaultBaseQty, setDefaultBaseQty] = useState(10000);
  const [defaultTimeframe, setDefaultTimeframe] = useState<number>(24);
  const [defaultVariance, setDefaultVariance] = useState<number>(25);
  const [defaultPeakHours, setDefaultPeakHours] = useState<boolean>(false);
  const [defaultQtyByType, setDefaultQtyByType] = useState<Partial<Record<EngagementType, number>>>({});
  const [rows, setRows] = useState<OrderRow[]>([]);
  // Per-link configuration parsed from CSV/TXT upload (URL | Type | Qty format).
  // When a brand-new row is created for a link, these initial values are seeded
  // as MANUAL edits so the user's defaults don't overwrite them.
  const [uploadedConfigs, setUploadedConfigs] = useState<Map<string, ParsedLink>>(new Map());
  // Optional schedule: ISO string (datetime-local). When set + in future, batch is
  // saved as `status='scheduled'` with a payload; a background poller picks it up.
  const [scheduledAt, setScheduledAt] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; ok: number; fail: number; total: number } | null>(null);

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
    // Bundle items can be edited/recreated by admin or in another tab. If we cache
    // too long, MassOrder will send stale user_bundle_item_id values and the edge
    // function returns "Bundle item <uuid> not found". Always refetch on mount.
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true,
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

  // Build rows from textarea
  useEffect(() => {
    const rawLines = linksText.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    // Parse each line through the smart parser so pasted format like
    // "URL | likes:1000 | comments:50" auto-fills overrides without file upload.
    const parsedByUrl = new Map<string, ParsedLink>();
    const unique: string[] = [];
    const seen = new Set<string>();
    for (const rawLine of rawLines) {
      const parsedArr = parseLinksFromText(rawLine);
      const parsed = parsedArr[0];
      const key = parsed?.url ?? rawLine;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(key);
      if (parsed && (parsed.baseQty != null || parsed.perTypeQty)) {
        parsedByUrl.set(key, parsed);
      }
    }

    setRows((prev) => {
      const prevByLink = new Map(prev.map(r => [r.link, r]));
      const activeSet = new Set<EngagementType>(activeTypes);
      return unique.map((l) => {
        const existing = prevByLink.get(l);
        const seed = existing ? undefined : (uploadedConfigs.get(l) ?? parsedByUrl.get(l));
        const enabled: Record<string, boolean> = {};
        const overrides: Partial<Record<EngagementType, number>> = {};
        if (existing?.qtyOverrides) {
          for (const k of Object.keys(existing.qtyOverrides) as EngagementType[]) {
            if (activeSet.has(k)) overrides[k] = existing.qtyOverrides[k];
          }
        }
        // Seed per-type overrides from upload
        if (seed?.perTypeQty) {
          for (const k of Object.keys(seed.perTypeQty) as EngagementType[]) {
            if (activeSet.has(k) && seed.perTypeQty[k]! > 0) overrides[k] = seed.perTypeQty[k]!;
          }
        }
        const manualTypes: Partial<Record<EngagementType, boolean>> = {};
        if (existing?.manualTypes) {
          for (const k of Object.keys(existing.manualTypes) as EngagementType[]) {
            if (activeSet.has(k) && existing.manualTypes[k]) manualTypes[k] = true;
          }
        }
        // Mark seeded types as manual so global defaults don't overwrite them
        if (seed?.perTypeQty) {
          for (const k of Object.keys(seed.perTypeQty) as EngagementType[]) {
            if (activeSet.has(k)) manualTypes[k] = true;
          }
        }
        activeTypes.forEach(t => {
          enabled[t] = existing ? (existing.enabledTypes[t] ?? true) : true;
          const isBase = t === "views" || itemByType[t]?.is_base;
          if (!isBase && !manualTypes[t]) {
            if (defaultQtyByType[t] != null && defaultQtyByType[t]! > 0) {
              overrides[t] = defaultQtyByType[t];
            } else {
              delete overrides[t];
            }
          }
        });
        const seedBase = seed?.baseQty && seed.baseQty > 0 ? seed.baseQty : undefined;
        const nextBase = existing?.manualBase
          ? existing.baseQuantity
          : (seedBase ?? defaultBaseQty);
        const nextTimeframe = existing?.manualTimeframe ? existing.timeLimitHours : defaultTimeframe;
        const nextVariance = existing?.manualVariance ? existing.variancePercent : defaultVariance;
        const nextPeak = existing?.manualPeak ? existing.peakHoursEnabled : defaultPeakHours;
        const nextManualBase = existing?.manualBase || (seedBase != null);
        return {
          id: existing?.id ?? uid(),
          link: l,
          baseQuantity: nextBase,
          timeLimitHours: nextTimeframe,
          enabledTypes: enabled as Record<EngagementType, boolean>,
          qtyOverrides: Object.keys(overrides).length > 0 ? overrides : undefined,
          variancePercent: nextVariance,
          peakHoursEnabled: nextPeak,
          manualBase: nextManualBase,
          manualTimeframe: existing?.manualTimeframe,
          manualVariance: existing?.manualVariance,
          manualPeak: existing?.manualPeak,
          manualTypes: Object.keys(manualTypes).length > 0 ? manualTypes : undefined,
          status: existing?.status ?? "idle" as const,
          message: existing?.message,
          orderNumber: existing?.orderNumber,
          orderId: existing?.orderId,
          price: existing?.price,
        };
      });
    });
    // Garbage-collect uploadedConfigs entries for links no longer in textarea
    setUploadedConfigs(prev => {
      if (prev.size === 0) return prev;
      const keep = new Set(unique);
      let changed = false;
      const next = new Map<string, ParsedLink>();
      for (const [k, v] of prev) {
        if (keep.has(k)) next.set(k, v); else changed = true;
      }
      return changed ? next : prev;
    });
  }, [linksText, activeTypes.join(","), defaultBaseQty, defaultTimeframe, defaultVariance, defaultPeakHours, defaultQtyByType, itemByType, uploadedConfigs]);


  // Memoized totals per row → O(1) lookup, O(N) total compute per dep-change
  const rowTotalsById = useMemo(() => {
    const map = new Map<string, { breakdown: { type: EngagementType; qty: number; price: number }[]; totalPrice: number; totalQty: number }>();
    for (const r of rows) {
      const breakdown: { type: EngagementType; qty: number; price: number }[] = [];
      let totalPrice = 0; let totalQty = 0;
      for (const type of activeTypes) {
        if (!r.enabledTypes[type]) continue;
        const item = itemByType[type];
        if (!item) continue;
        const ratio = DEFAULT_RATIOS[type] ?? 100;
        const isBase = type === "views" || item.is_base;
        const minQty = Number(item.min_qty || 0) || 1;
        const override = r.qtyOverrides?.[type];
        const raw = override != null
          ? override
          : (isBase ? r.baseQuantity : Math.round(r.baseQuantity * (ratio / 100)));
        const qty = Math.max(minQty, raw);
        const rate = Number(item.rate || 0);
        const price = (qty / 1000) * rate;
        breakdown.push({ type, qty, price });
        totalPrice += price; totalQty += qty;
      }
      map.set(r.id, { breakdown, totalPrice, totalQty });
    }
    return map;
  }, [rows, activeTypes, itemByType]);

  const computeRowTotals = useCallback((r: OrderRow) => {
    return rowTotalsById.get(r.id) ?? { breakdown: [], totalPrice: 0, totalQty: 0 };
  }, [rowTotalsById]);

  const grandTotal = useMemo(() => {
    let s = 0; for (const v of rowTotalsById.values()) s += v.totalPrice; return s;
  }, [rowTotalsById]);

  const invalidLines = useMemo(() => {
    const lines = linksText.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    return lines.filter(l => {
      const p = parseLinksFromText(l)[0];
      return !p || !isValidUrl(p.url);
    });
  }, [linksText]);

  const duplicates = useMemo(() => {
    const lines = linksText.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const counts: Record<string, number> = {};
    lines.forEach(l => {
      const p = parseLinksFromText(l)[0];
      const key = p?.url ?? l;
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).filter(([, c]) => c > 1).map(([l]) => l);
  }, [linksText]);

  const validRows = useMemo(() => rows.filter(r => isValidUrl(r.link)), [rows]);

  // Timeframe validation: 0 = Auto (smart), else must be integer 1-720 hours (30 days max)
  const isValidTimeframe = (h: number) =>
    Number.isInteger(h) && (h === 0 || (h >= 1 && h <= 720));
  const TIMEFRAME_ERR = "Custom hours must be a whole number between 1 and 720 (30 days)";

  const defaultTimeframeError = isValidTimeframe(defaultTimeframe) ? null : TIMEFRAME_ERR;
  const invalidTimeframeRowCount = useMemo(
    () => validRows.filter(r => !isValidTimeframe(r.timeLimitHours)).length,
    [validRows]
  );

  const canSubmit = !submitting
    && !!bundle
    && activeTypes.length > 0
    && validRows.length > 0
    && defaultBaseQty > 0
    && !defaultTimeframeError
    && invalidTimeframeRowCount === 0;

  const removeRow = useCallback((id: string) => {
    const row = rows.find(r => r.id === id);
    if (!row) return;
    setRows(prev => prev.filter(r => r.id !== id));
    setLinksText(prev => prev.split(/\r?\n/).filter(l => {
      const p = parseLinksFromText(l)[0];
      return (p?.url ?? l.trim()) !== row.link;
    }).join("\n"));
  }, [rows]);

  const updateRow = useCallback((id: string, patch: Partial<OrderRow>) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const next: OrderRow = { ...r, ...patch };
      if (patch.baseQuantity !== undefined && patch.manualBase === undefined) next.manualBase = true;
      if (patch.timeLimitHours !== undefined && patch.manualTimeframe === undefined) next.manualTimeframe = true;
      if (patch.variancePercent !== undefined && patch.manualVariance === undefined) next.manualVariance = true;
      if (patch.peakHoursEnabled !== undefined && patch.manualPeak === undefined) next.manualPeak = true;
      if (patch.qtyOverrides !== undefined && patch.manualTypes === undefined) {
        const mt: Partial<Record<EngagementType, boolean>> = { ...(r.manualTypes || {}) };
        const prevOv = r.qtyOverrides || {};
        const newOv = patch.qtyOverrides || {};
        const keys = new Set<string>([...Object.keys(prevOv), ...Object.keys(newOv)]);
        keys.forEach(k => {
          if (prevOv[k as EngagementType] !== newOv[k as EngagementType]) {
            mt[k as EngagementType] = true;
          }
        });
        next.manualTypes = mt;
      }
      return next;
    }));
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5MB", variant: "destructive" });
      return;
    }
    try {
      const text = await file.text();
      const parsed = parseLinksFromText(text);
      if (parsed.length === 0) {
        toast({ title: "No URLs found", description: "No valid links were found in the file", variant: "destructive" });
        return;
      }
      // Merge with existing textarea links (de-dupe by URL)
      const existing = linksText.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      const seen = new Set<string>(existing);
      const appended: string[] = [];
      const configsToAdd: Array<[string, ParsedLink]> = [];
      let withConfig = 0;
      for (const p of parsed) {
        if (!seen.has(p.url)) { seen.add(p.url); appended.push(p.url); }
        if (p.baseQty || p.perTypeQty) {
          configsToAdd.push([p.url, p]);
          withConfig++;
        }
      }
      setUploadedConfigs(prev => {
        const next = new Map(prev);
        for (const [k, v] of configsToAdd) next.set(k, v);
        return next;
      });
      const merged = [...existing, ...appended];
      setLinksText(merged.join("\n"));
      toast({
        title: `${parsed.length} link(s) loaded`,
        description: withConfig > 0
          ? `${withConfig} link(s) included custom quantities • Total unique: ${merged.length}`
          : `Total unique: ${merged.length}`,
      });
    } catch (err: any) {
      toast({ title: "File read failed", description: err.message, variant: "destructive" });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Validate schedule (datetime-local string). Empty = not scheduled. Else must
  // parse to a Date in the future (allow 30s grace for clock skew).
  const scheduledDate = useMemo(() => {
    if (!scheduledAt) return null;
    const d = new Date(scheduledAt);
    return Number.isFinite(d.getTime()) ? d : null;
  }, [scheduledAt]);
  const scheduleError = scheduledAt && !scheduledDate
    ? "Invalid date/time"
    : (scheduledDate && scheduledDate.getTime() < Date.now() - 30_000
        : "Scheduled time is in the past"
        : null);
  const isScheduledMode = !!scheduledDate && !scheduleError && scheduledDate.getTime() > Date.now();

  // Build the snapshot payload for a scheduled batch — everything the background
  // processor needs to recreate identical orders later, without re-reading state.
  function buildSchedulePayload() {
    return {
      bundle_id: bundle!.id,
      created_from: "mass_order_ui_v2",
      rows: validRows.map((r) => {
        const totals = computeRowTotals(r);
        const enabled = activeTypes.filter(t => r.enabledTypes[t]);
        return {
          link: r.link,
          base_quantity: r.baseQuantity,
          time_limit_hours: r.timeLimitHours,
          enabled_types: enabled,
          total_price: totals.totalPrice,
          items: enabled.map((type) => {
            const item = itemByType[type];
            const bd = totals.breakdown.find(b => b.type === type)!;
            return {
              user_bundle_item_id: item.id,
              engagement_type: type,
              quantity: bd.qty,
              price: bd.price,
              time_limit_hours: r.timeLimitHours,
              variance_percent: r.variancePercent,
              peak_hours_enabled: r.peakHoursEnabled,
            };
          }),
        };
      }),
    };
  }

  async function handleSubmitAll() {
    if (submitting || !bundle || !user) return;
    if (defaultTimeframeError) {
      toast({ title: "Invalid default timeframe", description: TIMEFRAME_ERR, variant: "destructive" });
      return;
    }
    if (invalidTimeframeRowCount > 0) {
      toast({
        title: `${invalidTimeframeRowCount} link(s) have an invalid timeframe`,
        description: TIMEFRAME_ERR + ". Please edit and fix.",
        variant: "destructive",
      });
      return;
    }
    if (scheduleError) {
      toast({ title: "Invalid schedule", description: scheduleError, variant: "destructive" });
      return;
    }
    if (!canSubmit) return;

    if (!isAdmin && subscriptionLoading) {
      toast({ title: "Checking subscription..." });
      return;
    }

    if (!isAdmin && !hasActiveSubscription) {
      setShowSubscriptionDialog(true);
      return;
    }

    // -------- SCHEDULED BRANCH --------
    if (isScheduledMode) {
      setSubmitting(true);
      const payload = buildSchedulePayload();
      const { error } = await supabase.from("mass_order_batches").insert({
        user_id: user.id,
        user_bundle_id: bundle.id,
        name: batchName.trim() || `Scheduled ${scheduledDate!.toLocaleString()}`,
        total_links: validRows.length,
        total_price: grandTotal,
        status: "scheduled",
        scheduled_at: scheduledDate!.toISOString(),
        payload: payload as any,
      });
      setSubmitting(false);
      if (error) {
        toast({ title: "Schedule failed", description: error.message, variant: "destructive" });
        return;
      }
      toast({
        title: "✅ Batch scheduled",
        description: `${validRows.length} order(s) ${scheduledDate!.toLocaleString()} pe auto-submit honge. (Tab open ya koi bhi user open kare jab time aaye)`,
      });
      qc.invalidateQueries({ queryKey: ["mass-batches"] });
      setLinksText("");
      setScheduledAt("");
      setTimeout(() => onSubmitted(), 1200);
      return;
    }

    // -------- IMMEDIATE BRANCH --------
    setSubmitting(true);
    setProgress({ done: 0, ok: 0, fail: 0, total: validRows.length });


    // 1. Create batch record
    const { data: batch, error: batchErr } = await supabase
      .from("mass_order_batches")
      .insert({
        user_id: user.id,
        user_bundle_id: bundle.id,
        name: batchName.trim() || `Batch ${new Date().toLocaleString()}`,
        total_links: validRows.length,
        total_price: grandTotal,
        status: "processing",
      })
      .select()
      .single();

    if (batchErr || !batch) {
      setSubmitting(false);
      setProgress(null);
      toast({ title: "Batch create failed", description: batchErr?.message, variant: "destructive" });
      return;
    }

    // 2. Chunked insert of batch items (500/chunk → handles 10k+ items)
    const itemRecords = validRows.map(r => {
      const totals = computeRowTotals(r);
      return {
        batch_id: batch.id,
        user_id: user.id,
        link: r.link,
        base_quantity: r.baseQuantity,
        time_limit_hours: r.timeLimitHours,
        enabled_types: activeTypes.filter(t => r.enabledTypes[t]) as any,
        price: totals.totalPrice,
        status: "pending",
      };
    });
    const INSERT_CHUNK = 500;
    const itemIdByLink = new Map<string, string>();
    for (let i = 0; i < itemRecords.length; i += INSERT_CHUNK) {
      const chunk = itemRecords.slice(i, i + INSERT_CHUNK);
      const { data: inserted, error: itemsErr } = await supabase
        .from("mass_order_batch_items")
        .insert(chunk)
        .select("id, link");
      if (itemsErr || !inserted) {
        setSubmitting(false);
        setProgress(null);
        toast({ title: "Batch items insert failed", description: itemsErr?.message, variant: "destructive" });
        return;
      }
      inserted.forEach((it: any) => itemIdByLink.set(it.link, it.id));
    }

    // 3. Parallel submission with bounded concurrency
    const CONCURRENCY = 6; // matches typical provider rate limits
    let ok = 0, fail = 0, done = 0;
    const queue = [...validRows];
    // Throttled UI state buffer — flush every 250ms instead of per-row
    const pending: Array<{ id: string; patch: Partial<OrderRow> }> = [];
    const flush = () => {
      if (pending.length === 0) return;
      const batchPatches = [...pending];
      pending.length = 0;
      setRows(prev => {
        const map = new Map(batchPatches.map(p => [p.id, p.patch]));
        return prev.map(r => map.has(r.id) ? { ...r, ...map.get(r.id)! } : r);
      });
    };
    const flusher = window.setInterval(flush, 250);

    const queueRow = (r: OrderRow, patch: Partial<OrderRow>) => {
      pending.push({ id: r.id, patch });
    };

    async function processOne(r: OrderRow) {
      queueRow(r, { status: "submitting", message: undefined });
      const batchItemId = itemIdByLink.get(r.link);
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
            variance_percent: r.variancePercent,
            peak_hours_enabled: r.peakHoursEnabled,
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
        const orderNumber = (data as any)?.order_number;
        const orderId = (data as any)?.order_id;
        queueRow(r, {
          status: "success",
          orderNumber,
          orderId,
          message: `Order #${orderNumber}`,
          price: totals.totalPrice,
        });
        if (batchItemId) {
          // fire-and-forget — don't block next row
          supabase.from("mass_order_batch_items").update({
            status: "success",
            engagement_order_id: orderId ?? null,
            engagement_order_number: orderNumber ?? null,
          }).eq("id", batchItemId).then(() => {});
        }
      } catch (e: any) {
        fail++;
        const msg = e?.message || "Failed";
        // If the edge function reports a stale bundle item, refresh the bundle
        // cache so the next attempt picks up current IDs.
        if (/bundle item .* not found/i.test(msg)) {
          qc.invalidateQueries({ queryKey: ["user-bundles-with-items", user?.id] });
        }
        queueRow(r, { status: "failed", message: msg });
        if (batchItemId) {
          supabase.from("mass_order_batch_items").update({
            status: "failed",
            error_message: msg,
          }).eq("id", batchItemId).then(() => {});
        }
      } finally {
        done++;
        setProgress({ done, ok, fail, total: validRows.length });
      }
    }

    async function worker() {
      while (queue.length > 0) {
        const r = queue.shift();
        if (!r) return;
        await processOne(r);
      }
    }

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, () => worker()));
    window.clearInterval(flusher);
    flush(); // final flush

    // 4. Finalize batch
    const finalStatus = fail === 0 ? "completed" : (ok === 0 ? "failed" : "partial");
    await supabase.from("mass_order_batches").update({
      success_count: ok,
      failed_count: fail,
      status: finalStatus,
    }).eq("id", batch.id);

    setSubmitting(false);
    setProgress(null);
    qc.invalidateQueries({ queryKey: ["mass-batches"] });
    toast({
      title: fail === 0 ? "🚀 All orders submitted" : "Submitted with some failures",
      description: `${ok} success, ${fail} failed`,
      variant: fail === 0 ? "default" : "destructive",
    });
    if (fail === 0) {
      setTimeout(() => onSubmitted(), 1500);
    }
  }


  const editingRow = rows.find(r => r.id === editingId) || null;

  return (
    <>
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
                Multiple links ek saath order karo. Paste karo ya CSV/TXT file upload karo, har link customize karo, batch me submit karo aur history me track karo.
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
              <AlertCircle className="w-4 h-4" /> This bundle has no linked services.
            </div>
          )}

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Campaign Name (optional)</Label>
            <Input value={batchName} onChange={(e) => setBatchName(e.target.value)} placeholder="e.g. Diwali Reels Mega Campaign 2026" className="h-11" />
          </div>
        </CardContent>
      </Card>

      {/* Links + defaults */}
      <Card className="glass-card border-2 border-border">
        <CardContent className="p-4 sm:p-6 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-foreground/10 flex items-center justify-center">
                <LinkIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <Label className="text-base sm:text-lg font-bold">Links</Label>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt,text/csv,text/plain"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-1.5" /> Upload CSV / TXT
              </Button>
            </div>
          </div>
          <Textarea
            placeholder={`Ek line par ek link (plain):\nhttps://instagram.com/p/abc\nhttps://instagram.com/reel/xyz\n\nYa CSV/TXT smart format:\nhttps://instagram.com/reel/abc | likes:1000 | comments:50 | shares:30\nhttps://instagram.com/reel/xyz | Views | 5000\nhttps://instagram.com/p/aaa, Likes, 2000\n\nDelimiter: | , ; ya tab. Type aliases: like/likes, view/views, share, comment, follower, save, repost, retweet, sub.`}
            value={linksText}
            onChange={(e) => setLinksText(e.target.value)}
            className="min-h-[160px] font-mono text-sm"
          />
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <span className="text-muted-foreground">{validRows.length} valid link(s)</span>
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
              {(() => {
                const isPreset = TIMEFRAMES.some(tf => tf.value === defaultTimeframe);
                const selectVal = isPreset ? String(defaultTimeframe) : "custom";
                const triggerLabel = isPreset
                  ? (TIMEFRAMES.find(tf => tf.value === defaultTimeframe)?.label ?? "")
                  : (defaultTimeframe > 0 ? `Custom: ${defaultTimeframe} hour${defaultTimeframe === 1 ? "" : "s"}` : "Custom (hours)");
                return (
                  <div className="space-y-2">
                    <Select
                      value={selectVal}
                      onValueChange={(v) => {
                        if (v === "custom") {
                          setDefaultTimeframe(defaultTimeframe && !TIMEFRAMES.some(tf => tf.value === defaultTimeframe) ? defaultTimeframe : 1);
                        } else {
                          setDefaultTimeframe(Number(v));
                        }
                      }}
                    >
                      <SelectTrigger className="h-12">
                        <span className="truncate">{triggerLabel}</span>
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEFRAMES.map(tf => (
                          <SelectItem key={tf.value} value={String(tf.value)}>{tf.label}</SelectItem>
                        ))}
                        <SelectItem value="custom">Custom (hours)</SelectItem>
                      </SelectContent>
                    </Select>
                    {selectVal === "custom" && (
                      <>
                        <div className="flex flex-wrap gap-1.5">
                          {[1, 3, 6, 12, 48, 96].map(h => (
                            <button
                              key={h}
                              type="button"
                              onClick={() => setDefaultTimeframe(h)}
                              className={`text-[11px] px-2 py-1 rounded-md border transition ${defaultTimeframe === h ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted border-border"}`}
                            >
                              {h}h
                            </button>
                          ))}
                        </div>
                        <Input
                          type="number"
                          min={1}
                          max={720}
                          step={1}
                          placeholder="Hours (1–720)"
                          value={defaultTimeframe || ""}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === "") { setDefaultTimeframe(0); return; }
                            const n = Number(raw);
                            setDefaultTimeframe(Number.isFinite(n) ? Math.floor(n) : 0);
                          }}
                          aria-invalid={!!defaultTimeframeError}
                          className={`h-11 font-semibold ${defaultTimeframeError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                        />
                        {defaultTimeframeError ? (
                          <p className="text-[11px] text-destructive">{defaultTimeframeError}</p>
                        ) : (
                          <p className="text-[11px] text-muted-foreground">Allowed: 1 hour – 720 hours (30 days)</p>
                        )}
                      </>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Default per-type quantities (likes, comments, shares, etc.) */}
          {activeTypes.filter(t => !(t === "views" || itemByType[t]?.is_base)).length > 0 && (
            <div className="pt-2 space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground block">
                Default Per-Type Quantities
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {activeTypes
                  .filter(t => !(t === "views" || itemByType[t]?.is_base))
                  .map((t) => {
                    const cfg = ENGAGEMENT_CONFIG[t];
                    const ratio = DEFAULT_RATIOS[t] ?? 100;
                    const computed = Math.round(defaultBaseQty * (ratio / 100));
                    const val = defaultQtyByType[t];
                    return (
                      <div key={t} className={`rounded-lg border ${cfg.borderColor} ${cfg.bgColor} p-2`}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-sm">{cfg.emoji}</span>
                          <span className={`text-[11px] font-semibold uppercase ${cfg.color}`}>{cfg.label}</span>
                        </div>
                        <Input
                          type="number"
                          min={0}
                          placeholder={String(computed)}
                          value={val ?? ""}
                          onChange={(e) => {
                            const raw = e.target.value;
                            setDefaultQtyByType((prev) => {
                              const next = { ...prev };
                              if (raw === "") { delete next[t]; }
                              else {
                                const n = Math.max(0, Math.floor(Number(raw) || 0));
                                next[t] = n;
                              }
                              return next;
                            });
                          }}
                          className="h-9 text-sm font-semibold bg-background"
                        />
                      </div>
                    );
                  })}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Empty chhoda toh views ratio se auto-calc hoga. Value badalne par sabhi rows (jo manually edit nahi hue) real-time update ho jayenge.
              </p>
            </div>
          )}

          {/* Default Variations (organic delivery tuning) — applies live to all non-manually edited rows */}
          <div className="pt-2 space-y-3 border-t border-border">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground block">
              Default Variations (organic tuning)
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">🎲 Random Variance</span>
                  <span className="text-xs font-bold text-primary">±{defaultVariance}%</span>
                </div>
                <input
                  type="range" min={10} max={50} step={5}
                  value={defaultVariance}
                  onChange={(e) => setDefaultVariance(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>10%</span><span>25%</span><span>50%</span>
                </div>
              </div>
              <label className="rounded-lg border border-border bg-muted/20 p-3 flex items-center justify-between gap-2 cursor-pointer">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-wider">🔥 Peak Hours Boost</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">More during 6–11 PM IST</div>
                </div>
                <input
                  type="checkbox"
                  checked={defaultPeakHours}
                  onChange={(e) => setDefaultPeakHours(e.target.checked)}
                  className="w-5 h-5 accent-primary"
                />
              </label>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Yeh defaults sabhi rows pe apply hote hain. Kisi row me alag chahiye toh edit dialog se override karo.
            </p>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Defaults sabhi rows par live apply hote hain. Manually edit ki hui rows preserved rehti hain — unhe row edit me "Reset to base ratio" se defaults par wapas la sakte ho.
          </p>
        </CardContent>
      </Card>

      {/* Preview cards — capped at 200 to keep DOM light for 1000+ link batches */}
      {rows.length > 0 && (() => {
        const PREVIEW_CAP = 200;
        const visibleRows = rows.slice(0, PREVIEW_CAP);
        const hiddenCount = rows.length - visibleRows.length;
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-lg sm:text-xl font-bold">Preview ({rows.length})</h2>
              <span className="text-sm font-bold bg-foreground text-background px-3 py-1.5 rounded-lg">
                Total: ₹{grandTotal.toFixed(2)}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {visibleRows.map((r) => {
                const t = computeRowTotals(r);
                const valid = isValidUrl(r.link);
                return (
                  <Card key={r.id} className={`border-2 transition-colors ${valid ? "border-border hover:border-primary/40" : "border-destructive/50"}`}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Link {!valid && <span className="text-destructive">· INVALID</span>}</div>
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
                        <span className={isValidTimeframe(r.timeLimitHours) ? "text-muted-foreground" : "text-destructive font-semibold"}>
                          ⏱ {TIMEFRAMES.find(tf => tf.value === r.timeLimitHours)?.label
                              || (isValidTimeframe(r.timeLimitHours) ? `${r.timeLimitHours}h` : `${r.timeLimitHours}h · invalid`)}
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
            {hiddenCount > 0 && (
              <div className="text-center text-xs text-muted-foreground py-2 border border-dashed border-border rounded-md">
                +{hiddenCount.toLocaleString()} more link(s) hidden for performance · sab orders submit honge, Batches tab me full list dekho
              </div>
            )}
          </div>
        );
      })()}

      {/* Schedule (optional) */}
      <Card className="glass-card border-2 border-border">
        <CardContent className="p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-primary" />
            <Label className="text-sm font-bold">Schedule (Optional)</Label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
            <Input
              type="datetime-local"
              value={scheduledAt}
              min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
              onChange={(e) => setScheduledAt(e.target.value)}
              className={`h-11 ${scheduleError ? "border-destructive" : ""}`}
              disabled={submitting}
            />
            {scheduledAt && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setScheduledAt("")}
                disabled={submitting}
              >
                Clear
              </Button>
            )}
          </div>
          {scheduleError ? (
            <p className="text-[11px] text-destructive">{scheduleError}</p>
          ) : isScheduledMode ? (
            <p className="text-[11px] text-primary font-semibold">
              ⏰ Auto-submit at {scheduledDate!.toLocaleString()} ({Math.max(1, Math.round((scheduledDate!.getTime() - Date.now()) / 60_000))} min se)
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              Khali chhoda toh order ab submit hoga. Future date/time set karne par batch background me uss time pe auto-process hogi.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Submit */}
      <Card className="glass-card border-2 border-primary/40 bg-gradient-to-br from-primary/5 via-transparent to-primary/10">
        <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground space-y-1">
            <div>
              {validRows.length} order(s) ready • Total <span className="font-bold text-foreground">₹{grandTotal.toFixed(2)}</span>
            </div>
            {progress && (
              <div className="flex items-center gap-3 text-xs">
                <span className="font-semibold text-foreground">{progress.done}/{progress.total}</span>
                <span className="text-green-600">✓ {progress.ok}</span>
                {progress.fail > 0 && <span className="text-destructive">✗ {progress.fail}</span>}
                <div className="flex-1 min-w-[120px] h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
                </div>
              </div>
            )}
          </div>
          <Button
            size="lg"
            disabled={!canSubmit || !!scheduleError}
            onClick={handleSubmitAll}
            className="w-full sm:w-auto min-w-[200px]"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> {isScheduledMode ? "Scheduling..." : "Submitting..."}</>
            ) : isScheduledMode ? (
              <><CalendarClock className="w-4 h-4 mr-2" /> Schedule Batch</>
            ) : (
              <><Rocket className="w-4 h-4 mr-2" /> Submit All Orders</>
            )}
          </Button>
        </CardContent>
      </Card>



      {showSubscriptionDialog && (
        <Suspense fallback={null}>
          <SubscriptionCheckDialog
            open={showSubscriptionDialog}
            onOpenChange={setShowSubscriptionDialog}
          />
        </Suspense>
      )}

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
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Base Quantity</Label>
                <Input type="number" min={1} value={editingRow.baseQuantity}
                  onChange={(e) => updateRow(editingRow.id, { baseQuantity: Math.max(1, Number(e.target.value) || 0) })}
                  className="h-11 font-semibold" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Timeframe</Label>
                {(() => {
                  const isPreset = TIMEFRAMES.some(tf => tf.value === editingRow.timeLimitHours);
                  const selectVal = isPreset ? String(editingRow.timeLimitHours) : "custom";
                  const triggerLabel = isPreset
                    ? (TIMEFRAMES.find(tf => tf.value === editingRow.timeLimitHours)?.label ?? "")
                    : (editingRow.timeLimitHours > 0 ? `Custom: ${editingRow.timeLimitHours} hour${editingRow.timeLimitHours === 1 ? "" : "s"}` : "Custom (hours)");
                  return (
                    <div className="space-y-2">
                      <Select
                        value={selectVal}
                        onValueChange={(v) => {
                          if (v === "custom") {
                            updateRow(editingRow.id, { timeLimitHours: editingRow.timeLimitHours || 1 });
                          } else {
                            updateRow(editingRow.id, { timeLimitHours: Number(v) });
                          }
                        }}
                      >
                        <SelectTrigger className="h-11">
                          <span className="truncate">{triggerLabel}</span>
                        </SelectTrigger>
                        <SelectContent>
                          {TIMEFRAMES.map(tf => <SelectItem key={tf.value} value={String(tf.value)}>{tf.label}</SelectItem>)}
                          <SelectItem value="custom">Custom (hours)</SelectItem>
                        </SelectContent>
                      </Select>
                      {selectVal === "custom" && (() => {
                        const rowErr = isValidTimeframe(editingRow.timeLimitHours) ? null : TIMEFRAME_ERR;
                        return (
                          <>
                            <div className="flex flex-wrap gap-1.5">
                              {[1, 3, 6, 12, 48, 96].map(h => (
                                <button
                                  key={h}
                                  type="button"
                                  onClick={() => updateRow(editingRow.id, { timeLimitHours: h })}
                                  className={`text-[11px] px-2 py-1 rounded-md border transition ${editingRow.timeLimitHours === h ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted border-border"}`}
                                >
                                  {h}h
                                </button>
                              ))}
                            </div>
                            <Input
                              type="number"
                              min={1}
                              max={720}
                              step={1}
                              placeholder="Hours (1–720)"
                              value={editingRow.timeLimitHours || ""}
                              onChange={(e) => {
                                const raw = e.target.value;
                                if (raw === "") { updateRow(editingRow.id, { timeLimitHours: 0 }); return; }
                                const n = Number(raw);
                                updateRow(editingRow.id, { timeLimitHours: Number.isFinite(n) ? Math.floor(n) : 0 });
                              }}
                              aria-invalid={!!rowErr}
                              className={`h-10 font-semibold ${rowErr ? "border-destructive focus-visible:ring-destructive" : ""}`}
                            />
                            {rowErr ? (
                              <p className="text-[11px] text-destructive">{rowErr}</p>
                            ) : (
                              <p className="text-[11px] text-muted-foreground">Allowed: 1–720 hours (30 days max)</p>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  );
                })()}
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Engagement Types & Quantities</Label>
                  {editingRow.qtyOverrides && Object.keys(editingRow.qtyOverrides).length > 0 && (
                    <button
                      type="button"
                      onClick={() => updateRow(editingRow.id, { qtyOverrides: {}, manualTypes: {} })}
                      className="text-[11px] text-primary hover:underline"
                    >
                      Reset to base ratio
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {activeTypes.map((type) => {
                    const item = itemByType[type];
                    const ratio = DEFAULT_RATIOS[type] ?? 100;
                    const isBase = type === "views" || item?.is_base;
                    const computed = isBase ? editingRow.baseQuantity : Math.round(editingRow.baseQuantity * (ratio / 100));
                    const currentQty = editingRow.qtyOverrides?.[type] ?? computed;
                    const enabled = editingRow.enabledTypes[type] ?? false;
                    return (
                      <div key={type} className="flex items-center gap-2 px-3 py-2 border border-border rounded-md">
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={(e) => updateRow(editingRow.id, {
                            enabledTypes: { ...editingRow.enabledTypes, [type]: e.target.checked },
                          })}
                        />
                        <span className="text-sm capitalize flex-1">{ENGAGEMENT_CONFIG[type]?.emoji} {type}</span>
                        <Input
                          type="number"
                          min={1}
                          disabled={!enabled}
                          value={currentQty}
                          onChange={(e) => {
                            const v = Math.max(1, Number(e.target.value) || 0);
                            updateRow(editingRow.id, {
                              qtyOverrides: { ...(editingRow.qtyOverrides || {}), [type]: v },
                            });
                          }}
                          className="h-9 w-28 text-right font-semibold"
                        />
                      </div>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  Tip: har service ki quantity yahan independently set kar sakte ho (views, likes, shares — sab alag).
                </p>
              </div>
              {/* Variations override — per-row */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Variations</Label>
                  {(editingRow.manualVariance || editingRow.manualPeak) && (
                    <button
                      type="button"
                      onClick={() => updateRow(editingRow.id, {
                        variancePercent: defaultVariance,
                        peakHoursEnabled: defaultPeakHours,
                        manualVariance: false,
                        manualPeak: false,
                      })}
                      className="text-[11px] text-primary hover:underline"
                    >
                      Reset to defaults
                    </button>
                  )}
                </div>
                <div className="rounded-md border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">🎲 Random Variance</span>
                    <span className="text-xs font-bold text-primary">±{editingRow.variancePercent}%</span>
                  </div>
                  <input
                    type="range" min={10} max={50} step={5}
                    value={editingRow.variancePercent}
                    onChange={(e) => updateRow(editingRow.id, { variancePercent: Number(e.target.value) })}
                    className="w-full accent-primary"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>10%</span><span>25%</span><span>50%</span>
                  </div>
                </div>
                <label className="rounded-md border border-border p-3 flex items-center justify-between gap-2 cursor-pointer">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold">🔥 Peak Hours Boost</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">More during 6–11 PM IST</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={editingRow.peakHoursEnabled}
                    onChange={(e) => updateRow(editingRow.id, { peakHoursEnabled: e.target.checked })}
                    className="w-5 h-5 accent-primary"
                  />
                </label>
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
    </>
  );
}

/* ============================================================
   BATCH HISTORY
   ============================================================ */

function BatchHistory() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [openBatchId, setOpenBatchId] = useState<string | null>(null);
  const [deleteBatchId, setDeleteBatchId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: batches, isLoading, refetch } = useQuery({
    queryKey: ["mass-batches", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mass_order_batches")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });

  const filtered = useMemo(() => {
    let list = batches || [];
    if (statusFilter !== "all") list = list.filter(b => b.status === statusFilter);
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter((b: any) => (b.name || "").toLowerCase().includes(s));
    }
    return list;
  }, [batches, search, statusFilter]);

  const stats = useMemo(() => {
    const all = batches || [];
    const total = all.length;
    const completed = all.filter((b: any) => b.status === "completed").length;
    const processing = all.filter((b: any) => b.status === "processing").length;
    const failed = all.filter((b: any) => b.status === "failed").length;
    const partial = all.filter((b: any) => b.status === "partial").length;
    const totalSuccess = all.reduce((s: number, b: any) => s + (b.success_count || 0), 0);
    const totalLinks = all.reduce((s: number, b: any) => s + (b.total_links || 0), 0);
    const successRate = totalLinks > 0 ? Math.round((totalSuccess / totalLinks) * 100) : 0;
    return { total, completed, processing, failed, partial, successRate };
  }, [batches]);

  async function downloadCSV(batchId: string, batchName: string) {
    const { data, error } = await supabase
      .from("mass_order_batch_items")
      .select("*")
      .eq("batch_id", batchId)
      .order("created_at", { ascending: true });
    if (error || !data) {
      toast({ title: "Download failed", description: error?.message, variant: "destructive" });
      return;
    }
    const headers = ["link", "base_quantity", "time_limit_hours", "enabled_types", "status", "engagement_order_number", "price", "error_message"];
    const rows = data.map((r: any) => [
      r.link,
      r.base_quantity,
      r.time_limit_hours,
      JSON.stringify(r.enabled_types || []),
      r.status,
      r.engagement_order_number || "",
      r.price,
      (r.error_message || "").replace(/"/g, '""'),
    ]);
    const csv = [headers, ...rows].map(row =>
      row.map(c => {
        const s = String(c ?? "");
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(",")
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${batchName.replace(/[^a-z0-9-_]+/gi, "_")}_${batchId.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function deleteBatch(batchId: string) {
    if (!user) return;
    setDeleting(true);
    try {
      // 1. Get all engagement_order_ids linked to this batch
      const { data: items, error: itemsErr } = await supabase
        .from("mass_order_batch_items")
        .select("engagement_order_id")
        .eq("batch_id", batchId)
        .eq("user_id", user.id);
      if (itemsErr) throw itemsErr;

      const orderIds = (items || [])
        .map((i: any) => i.engagement_order_id)
        .filter((x: any) => !!x);

      // 2. Cancel + hard-delete linked engagement orders (runs/items/orders) via RPC
      if (orderIds.length > 0) {
        const { error: rpcErr } = await supabase.rpc(
          'user_cancel_and_delete_engagement_orders' as any,
          { _order_ids: orderIds }
        );
        if (rpcErr) throw rpcErr;
      }

      // 3. Delete batch items
      const { error: delItemsErr } = await supabase
        .from("mass_order_batch_items")
        .delete()
        .eq("batch_id", batchId)
        .eq("user_id", user.id);
      if (delItemsErr) throw delItemsErr;

      // 4. Delete batch row
      const { error: delBatchErr } = await supabase
        .from("mass_order_batches")
        .delete()
        .eq("id", batchId)
        .eq("user_id", user.id);
      if (delBatchErr) throw delBatchErr;

      toast({ title: "Batch deleted", description: `${orderIds.length} order(s) cancelled & removed from DB` });
      qc.invalidateQueries({ queryKey: ["mass-batches"] });
      qc.invalidateQueries({ queryKey: ["user-engagement-orders"] });
      setDeleteBatchId(null);
    } catch (e: any) {
      toast({ title: "Delete failed", description: e?.message || "Unknown error", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total Batches", value: stats.total, color: "text-foreground" },
          { label: "Completed", value: stats.completed, color: "text-green-600" },
          { label: "Processing", value: stats.processing, color: "text-primary" },
          { label: "Failed / Partial", value: stats.failed + stats.partial, color: "text-destructive" },
          { label: "Success Rate", value: `${stats.successRate}%`, color: "text-foreground" },
        ].map((s) => (
          <Card key={s.label} className="border-2 border-border">
            <CardContent className="p-3 sm:p-4">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
              <div className={`text-xl sm:text-2xl font-bold mt-1 ${s.color}`}>{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="border-2 border-border">
        <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Search by campaign name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => refetch()}>Refresh</Button>
        </CardContent>
      </Card>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading batches...
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
            Koi batch nahi mila. Naya batch banane ke liye Create tab par jao.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((b: any) => {
            const pct = b.total_links > 0 ? Math.round((b.success_count / b.total_links) * 100) : 0;
            const statusColor =
              b.status === "completed" ? "bg-green-600/15 text-green-600 border-green-600/30"
              : b.status === "processing" ? "bg-primary/15 text-primary border-primary/30"
              : b.status === "scheduled" ? "bg-blue-600/15 text-blue-600 border-blue-600/30"
              : b.status === "partial" ? "bg-yellow-600/15 text-yellow-600 border-yellow-600/30"
              : "bg-destructive/15 text-destructive border-destructive/30";
            const scheduledIn = b.status === "scheduled" && b.scheduled_at
              ? Math.round((new Date(b.scheduled_at).getTime() - Date.now()) / 60_000)
              : null;
            return (
              <Card key={b.id} className="border-2 border-border hover:border-primary/30 transition-colors">
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold truncate">{b.name || `Batch ${b.id.slice(0, 8)}`}</span>
                      <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${statusColor}`}>{b.status}</span>
                      {scheduledIn !== null && (
                        <span className="text-[10px] text-blue-600 font-semibold">
                          <Clock className="w-3 h-3 inline mr-0.5" />
                          {scheduledIn > 0 ? `in ${scheduledIn} min` : "due now"}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(b.created_at).toLocaleString()} • {b.total_links} links • ₹{Number(b.total_price).toFixed(2)}
                      {b.scheduled_at && (
                        <span className="ml-2 text-blue-600">⏰ {new Date(b.scheduled_at).toLocaleString()}</span>
                      )}
                    </div>
                    <div className="text-xs mt-1">
                      <span className="text-green-600 font-semibold">{b.success_count} success</span>
                      {b.failed_count > 0 && <span className="text-destructive font-semibold ml-2">{b.failed_count} failed</span>}
                      <span className="text-muted-foreground ml-2">({pct}% rate)</span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => setOpenBatchId(b.id)}>View</Button>
                    <Button variant="outline" size="sm" onClick={() => downloadCSV(b.id, b.name || b.id)}>
                      <Download className="w-3.5 h-3.5 mr-1" /> CSV
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => setDeleteBatchId(b.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <BatchDetailDialog batchId={openBatchId} onClose={() => setOpenBatchId(null)} />

      <AlertDialog open={!!deleteBatchId} onOpenChange={(o) => !o && !deleting && setDeleteBatchId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this batch?</AlertDialogTitle>
            <AlertDialogDescription>
              Batch ke saare engagement orders cancel honge, pending runs providers ke pass nahi jayenge,
              aur batch + orders permanently DB se delete ho jayenge. Ye action undo nahi ho sakta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => { e.preventDefault(); if (deleteBatchId) deleteBatch(deleteBatchId); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Deleting...</> : "Yes, delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BatchDetailDialog({ batchId, onClose }: { batchId: string | null; onClose: () => void }) {
  const { data: items, isLoading } = useQuery({
    queryKey: ["mass-batch-items", batchId],
    enabled: !!batchId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mass_order_batch_items")
        .select("*")
        .eq("batch_id", batchId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <Dialog open={!!batchId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Batch Details</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center gap-2 py-6 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
        ) : (
          <div className="space-y-2">
            {(items || []).slice(0, 250).map((it: any) => (
              <div key={it.id} className="border border-border rounded-md p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-xs truncate" title={it.link}>{it.link}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      Base {it.base_quantity?.toLocaleString()} • {it.time_limit_hours}h • ₹{Number(it.price).toFixed(2)}
                    </div>
                    {it.error_message && (
                      <div className="text-[11px] text-destructive mt-1">{it.error_message}</div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${
                      it.status === "success" ? "bg-green-600/15 text-green-600 border-green-600/30"
                      : it.status === "failed" ? "bg-destructive/15 text-destructive border-destructive/30"
                      : "bg-muted text-muted-foreground border-border"
                    }`}>{it.status}</span>
                    {it.engagement_order_number && (
                      <div className="mt-1">
                        <RouterLink to={`/engagement-orders/${it.engagement_order_number}`} className="text-xs underline text-primary">
                          #{it.engagement_order_number}
                        </RouterLink>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {(items || []).length > 250 && (
              <div className="text-center text-xs text-muted-foreground py-2 border border-dashed border-border rounded-md">
                +{((items || []).length - 250).toLocaleString()} more hidden for speed · full list CSV download me available hai
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
