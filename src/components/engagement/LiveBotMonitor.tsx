import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Activity, Bot, ShieldCheck, Zap, Gauge, Radio,
  Cpu, Eye, TrendingUp, Sparkles, CheckCircle2, XCircle, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNowStrict } from "date-fns";

interface RunLike {
  id: string;
  status: string;
  quantity_to_send: number;
  provider_status?: string | null;
  provider_remains?: number | null;
  completed_at?: string | null;
  started_at?: string | null;
  scheduled_at?: string | null;
  engagement_type?: string;
  error_message?: string | null;
}

interface Props {
  runs: RunLike[];
  totalQuantity: number;
  totalDelivered: number;
  platform: string;
}

const ACTION_VERBS: Record<string, string> = {
  views: "views", likes: "likes", comments: "comments",
  saves: "saves", shares: "shares", reposts: "reposts",
  followers: "followers", subscribers: "subscribers",
  watch_hours: "watch hours", retweets: "retweets",
};

// Compute real delivered from a single run
const deliveredOf = (r: RunLike): number => {
  const ps = (r.provider_status ?? "").toString().toLowerCase().trim();
  if (ps === "completed" || ps === "complete") return r.quantity_to_send;
  if (r.provider_remains !== null && r.provider_remains !== undefined) {
    return Math.max(0, r.quantity_to_send - r.provider_remains);
  }
  if (r.status === "completed") return r.quantity_to_send;
  return 0;
};

export function LiveBotMonitor({ runs, totalQuantity, totalDelivered, platform }: Props) {
  // Re-render every 5s to refresh "time ago" labels & throughput window
  const [, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(i);
  }, []);

  const metrics = useMemo(() => {
    const completed = runs.filter((r) => r.status === "completed");
    const failed = runs.filter((r) => r.status === "failed");
    const pending = runs.filter((r) => r.status === "pending");
    const started = runs.filter((r) => r.status === "started");

    const finishedCount = completed.length + failed.length;
    const successRate = finishedCount > 0 ? (completed.length / finishedCount) * 100 : 100;
    const failRate = finishedCount > 0 ? (failed.length / finishedCount) * 100 : 0;

    // Throughput sparkline — delivered per minute, last 30 minutes
    const now = Date.now();
    const WINDOW_MIN = 30;
    const buckets = Array.from({ length: WINDOW_MIN }, () => 0);
    for (const r of completed) {
      const ts = r.completed_at ? new Date(r.completed_at).getTime() : 0;
      if (!ts) continue;
      const ageMin = Math.floor((now - ts) / 60000);
      if (ageMin >= 0 && ageMin < WINDOW_MIN) {
        buckets[WINDOW_MIN - 1 - ageMin] += deliveredOf(r);
      }
    }
    // Velocity = average delivery over last 5 minutes
    const recent = buckets.slice(-5).reduce((a, b) => a + b, 0);
    const velocityPerMin = Math.round(recent / 5);

    // Progress
    const progressPct = totalQuantity > 0 ? Math.min(100, (totalDelivered / totalQuantity) * 100) : 0;

    // Proxy health proxy = inverse of recent failure intensity + base
    const proxyHealth = Math.max(80, 100 - failRate * 1.2);

    // Recent activity (last 8 completed runs)
    const recentEvents = [...runs]
      .filter((r) => r.completed_at || r.status === "failed")
      .sort((a, b) => {
        const ta = new Date(a.completed_at || a.started_at || 0).getTime();
        const tb = new Date(b.completed_at || b.started_at || 0).getTime();
        return tb - ta;
      })
      .slice(0, 8);

    return {
      completed, failed, pending, started,
      successRate, failRate,
      buckets, velocityPerMin,
      progressPct,
      proxyHealth,
      recentEvents,
      queueDepth: pending.length + started.length,
    };
  }, [runs, totalQuantity, totalDelivered]);

  // Build sparkline path
  const sparkPath = useMemo(() => {
    const w = 100, h = 36;
    const pts = metrics.buckets;
    const max = Math.max(...pts, 1);
    return pts
      .map((v, i) => {
        const x = (i / (pts.length - 1)) * w;
        const y = h - (v / max) * h;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [metrics.buckets]);

  if (runs.length === 0) return null;

  const realAcct = metrics.successRate;
  const botRate = metrics.failRate; // failed deliveries treated as "bot detected / blocked"
  const antiDetect = Math.max(0, Math.min(100, 100 - metrics.failRate * 0.8));

  return (
    <Card className="border-2 border-border bg-card overflow-hidden relative">
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)),transparent_60%)]" />

      <CardContent className="p-4 sm:p-6 relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-5 gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-primary/40 bg-primary/10 flex items-center justify-center shrink-0">
              <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold tracking-tight text-foreground truncate">
                Live Delivery Monitor
              </h3>
              <p className="font-mono text-[9px] sm:text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                :real-time · {platform}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-500/40 bg-emerald-500/10">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-mono text-[9px] sm:text-[10px] tracking-[0.15em] uppercase text-emerald-500 font-semibold">
              live
            </span>
          </div>
        </div>

        {/* Core stat grid — derived from REAL runs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mb-4 sm:mb-5">
          <MetricTile
            icon={<ShieldCheck className="h-3.5 w-3.5" />}
            label=":success rate"
            value={`${realAcct.toFixed(1)}%`}
            tone="emerald"
            bar={realAcct}
          />
          <MetricTile
            icon={<Bot className="h-3.5 w-3.5" />}
            label=":bot / blocked"
            value={`${botRate.toFixed(2)}%`}
            tone="amber"
            bar={Math.min(100, botRate * 3)}
            invert
          />
          <MetricTile
            icon={<Cpu className="h-3.5 w-3.5" />}
            label=":anti-detect"
            value={`${antiDetect.toFixed(1)}%`}
            tone="primary"
            bar={antiDetect}
          />
          <MetricTile
            icon={<Zap className="h-3.5 w-3.5" />}
            label=":velocity /min"
            value={metrics.velocityPerMin.toLocaleString()}
            tone="sky"
            bar={Math.min(100, totalQuantity > 0 ? (metrics.velocityPerMin / Math.max(1, totalQuantity / 60)) * 100 : 0)}
          />
        </div>

        {/* Mid row — sparkline + queue + proxies */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 sm:gap-3 mb-4 sm:mb-5">
          {/* Sparkline */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-secondary/40 p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
                  :throughput · last 30m
                </span>
              </div>
              <span className="text-[11px] font-medium text-foreground">
                {metrics.velocityPerMin.toLocaleString()}/min
              </span>
            </div>
            <svg viewBox="0 0 100 36" preserveAspectRatio="none" className="w-full h-14 sm:h-16">
              <defs>
                <linearGradient id="sparkGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={`${sparkPath} L100,36 L0,36 Z`} fill="url(#sparkGrad)" />
              <path d={sparkPath} fill="none" stroke="hsl(var(--primary))" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          {/* Queue + proxies */}
          <div className="rounded-xl border border-border bg-secondary/40 p-3 sm:p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Radio className="h-3.5 w-3.5 text-primary" />
                <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
                  :queue
                </span>
              </div>
              <span className="font-serif text-lg leading-none text-foreground">{metrics.queueDepth}</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center gap-2">
                <Gauge className="h-3.5 w-3.5 text-emerald-500" />
                <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
                  :node health
                </span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-500">
                {metrics.proxyHealth.toFixed(1)}%
              </span>
            </div>
            <div className="mt-2 grid grid-cols-12 gap-[2px]">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1.5 rounded-sm transition-colors",
                    i < Math.round((metrics.proxyHealth / 100) * 12)
                      ? "bg-emerald-500/80"
                      : "bg-border"
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Bottom — progress + activity feed */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 sm:gap-3">
          {/* Progress + run counters */}
          <div className="rounded-xl border border-border bg-secondary/40 p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
                :delivery progress
              </span>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="font-serif text-2xl text-primary tabular-nums">
                {totalDelivered.toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground">
                / {totalQuantity.toLocaleString()} delivered ({metrics.progressPct.toFixed(1)}%)
              </span>
            </div>
            <div className="h-2 rounded-full bg-border overflow-hidden mb-3">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary transition-all duration-700"
                style={{ width: `${metrics.progressPct}%` }}
              />
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <RunCounter label="done" value={metrics.completed.length} tone="emerald" icon={<CheckCircle2 className="h-3 w-3" />} />
              <RunCounter label="active" value={metrics.started.length} tone="sky" icon={<Activity className="h-3 w-3" />} />
              <RunCounter label="queued" value={metrics.pending.length} tone="primary" icon={<Clock className="h-3 w-3" />} />
              <RunCounter label="failed" value={metrics.failed.length} tone="amber" icon={<XCircle className="h-3 w-3" />} />
            </div>
          </div>

          {/* Activity feed — real run events */}
          <div className="rounded-xl border border-border bg-secondary/40 p-3 sm:p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Eye className="h-3.5 w-3.5 text-primary" />
                <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
                  :live activity
                </span>
              </div>
              <Sparkles className="h-3 w-3 text-primary animate-pulse" />
            </div>
            <div className="space-y-1.5 min-h-[160px]">
              {metrics.recentEvents.length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic">Waiting for first delivery…</p>
              ) : (
                metrics.recentEvents.map((e, i) => {
                  const ok = e.status === "completed";
                  const ts = e.completed_at || e.started_at;
                  const ago = ts ? formatDistanceToNowStrict(new Date(ts), { addSuffix: false }) : "now";
                  const verb = ACTION_VERBS[e.engagement_type || ""] || e.engagement_type || "delivered";
                  const qty = deliveredOf(e);
                  return (
                    <div
                      key={e.id}
                      className={cn(
                        "flex items-center gap-2 text-[11px] sm:text-[12px] py-1 px-2 rounded-md transition-all",
                        i === 0 ? "bg-primary/5 border border-primary/20" : "border border-transparent",
                      )}
                      style={{ opacity: 1 - i * 0.09 }}
                    >
                      {ok ? (
                        <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="h-3 w-3 text-amber-500 shrink-0" />
                      )}
                      <span className="font-mono text-foreground tabular-nums">
                        +{(ok ? qty : e.quantity_to_send).toLocaleString()}
                      </span>
                      <span className="text-muted-foreground truncate">{verb}</span>
                      {!ok && (
                        <span className="text-[9px] text-amber-500 font-mono uppercase tracking-wider">
                          retry
                        </span>
                      )}
                      <span className="ml-auto font-mono text-[9px] text-muted-foreground/70 shrink-0">
                        {ago} ago
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer mini-stats */}
        <div className="mt-4 pt-3 border-t border-border flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] font-mono tracking-wider uppercase text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            runs · {runs.length}
          </span>
          <span>· completed {metrics.completed.length}</span>
          <span>· queued {metrics.pending.length}</span>
          <span className="ml-auto text-primary/80">:organic engine v4.2</span>
        </div>
      </CardContent>
    </Card>
  );
}

function RunCounter({
  label, value, tone, icon,
}: { label: string; value: number; tone: "emerald" | "sky" | "primary" | "amber"; icon: React.ReactNode }) {
  const toneCfg = {
    emerald: "text-emerald-500 border-emerald-500/30",
    sky: "text-sky-500 border-sky-500/30",
    primary: "text-primary border-primary/30",
    amber: "text-amber-500 border-amber-500/30",
  }[tone];
  return (
    <div className={cn("rounded-lg border bg-card/40 px-1.5 py-2", toneCfg.split(" ")[1])}>
      <div className={cn("flex items-center justify-center gap-1", toneCfg.split(" ")[0])}>
        {icon}
        <span className="font-serif text-base leading-none tabular-nums">{value}</span>
      </div>
      <div className="font-mono text-[8px] tracking-[0.15em] uppercase text-muted-foreground mt-1">
        {label}
      </div>
    </div>
  );
}

function MetricTile({
  icon, label, value, tone, bar, invert,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "emerald" | "amber" | "primary" | "sky";
  bar: number;
  invert?: boolean;
}) {
  const toneCfg = {
    emerald: { text: "text-emerald-500", bg: "bg-emerald-500", ring: "border-emerald-500/30" },
    amber:   { text: "text-amber-500",   bg: "bg-amber-500",   ring: "border-amber-500/30" },
    primary: { text: "text-primary",     bg: "bg-primary",     ring: "border-primary/30" },
    sky:     { text: "text-sky-500",     bg: "bg-sky-500",     ring: "border-sky-500/30" },
  }[tone];

  return (
    <div className={cn("rounded-xl border bg-secondary/40 p-2.5 sm:p-3 transition-all hover:bg-secondary/70", toneCfg.ring)}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className={toneCfg.text}>{icon}</span>
        <span className="font-mono text-[9px] sm:text-[10px] tracking-[0.16em] uppercase text-muted-foreground truncate">
          {label}
        </span>
      </div>
      <div className={cn("font-serif text-lg sm:text-2xl leading-none mb-2 tabular-nums", toneCfg.text)}>
        {value}
      </div>
      <div className="h-1 rounded-full bg-border overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700", toneCfg.bg, invert && "opacity-70")}
          style={{ width: `${Math.max(2, Math.min(100, bar))}%` }}
        />
      </div>
    </div>
  );
}
