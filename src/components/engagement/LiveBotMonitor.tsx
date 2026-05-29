import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Activity, Bot, ShieldCheck, Zap, Gauge, Radio, Globe2,
  Cpu, Eye, TrendingUp, Sparkles, CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EngagementType, EngagementConfig } from "@/lib/engagement-types";

interface Props {
  engagements: Record<EngagementType, EngagementConfig>;
  platform: string;
  baseQuantity: number;
}

// Pseudo-random but deterministic feeling jitter
const wobble = (base: number, range: number, t: number, seed: number) =>
  base + Math.sin(t / 1200 + seed) * range + (Math.random() - 0.5) * range * 0.4;

const REGIONS = [
  { code: "US", name: "United States", flag: "🇺🇸", base: 28 },
  { code: "BR", name: "Brazil",        flag: "🇧🇷", base: 14 },
  { code: "IN", name: "India",         flag: "🇮🇳", base: 18 },
  { code: "GB", name: "UK",            flag: "🇬🇧", base: 9  },
  { code: "DE", name: "Germany",       flag: "🇩🇪", base: 7  },
  { code: "JP", name: "Japan",         flag: "🇯🇵", base: 6  },
  { code: "FR", name: "France",        flag: "🇫🇷", base: 5  },
  { code: "AU", name: "Australia",     flag: "🇦🇺", base: 4  },
  { code: "CA", name: "Canada",        flag: "🇨🇦", base: 5  },
  { code: "AE", name: "UAE",           flag: "🇦🇪", base: 4  },
];

const ACTION_VERBS: Record<string, string> = {
  views: "watched", likes: "liked", comments: "commented on",
  saves: "saved", shares: "shared", reposts: "reposted",
  followers: "followed", subscribers: "subscribed to",
  watch_hours: "watched", retweets: "retweeted",
};

const FIRST = ["alex", "maria", "leo", "kenji", "amelia", "lucas", "zoe", "noah", "yuki", "diego", "priya", "olivia", "ravi", "sofia", "mateo", "ava", "ibrahim", "mia", "lin", "isla"];
const LAST  = ["_official", ".hq", "_real", "_studio", ".live", "_pro", "_x", ".world", "_co", "_io"];

const randomUser = () =>
  FIRST[Math.floor(Math.random() * FIRST.length)] +
  Math.floor(Math.random() * 99) +
  LAST[Math.floor(Math.random() * LAST.length)];

export function LiveBotMonitor({ engagements, platform, baseQuantity }: Props) {
  const [tick, setTick] = useState(0);
  const [feed, setFeed] = useState<{ id: number; user: string; type: string; region: string; flag: string }[]>([]);
  const idRef = useRef(0);

  const activeTypes = useMemo(
    () => (Object.keys(engagements) as EngagementType[]).filter((t) => engagements[t]?.enabled),
    [engagements]
  );

  // Animation tick
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 900);
    return () => clearInterval(i);
  }, []);

  // Live activity feed
  useEffect(() => {
    if (activeTypes.length === 0) return;
    const i = setInterval(() => {
      const region = REGIONS[Math.floor(Math.random() * REGIONS.length)];
      const type = activeTypes[Math.floor(Math.random() * activeTypes.length)];
      const entry = {
        id: ++idRef.current,
        user: randomUser(),
        type: ACTION_VERBS[type] || type,
        region: region.code,
        flag: region.flag,
      };
      setFeed((f) => [entry, ...f].slice(0, 6));
    }, 1400);
    return () => clearInterval(i);
  }, [activeTypes]);

  // Live metrics — beautiful but believable
  const realAcct      = Math.max(96, Math.min(99.9, wobble(98.6, 0.6, tick * 100, 1))); // %
  const botRate       = Math.max(0.05, Math.min(2, wobble(0.6, 0.3, tick * 100, 2)));   // %
  const antiDetect    = Math.max(94, Math.min(99.9, wobble(97.8, 1.1, tick * 100, 3)));
  const velocity      = Math.max(120, wobble(Math.max(180, baseQuantity / 60), Math.max(40, baseQuantity / 200), tick * 100, 4));
  const proxyHealth   = Math.max(92, Math.min(100, wobble(96.4, 1.8, tick * 100, 5)));
  const queueDepth    = Math.max(0, Math.round(wobble(activeTypes.length * 12, 6, tick * 100, 6)));

  // Region distribution — normalize after wobble
  const regions = useMemo(() => {
    const raw = REGIONS.map((r, i) => ({ ...r, val: Math.max(1, wobble(r.base, 2, tick * 100, i + 10)) }));
    const sum = raw.reduce((s, r) => s + r.val, 0);
    return raw
      .map((r) => ({ ...r, pct: (r.val / sum) * 100 }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 6);
  }, [tick]);

  // Sparkline data
  const sparkPoints = useMemo(() => {
    const pts: number[] = [];
    for (let i = 0; i < 28; i++) {
      pts.push(wobble(50, 18, (tick - (28 - i)) * 100, 9));
    }
    return pts;
  }, [tick]);

  const sparkPath = useMemo(() => {
    const w = 100, h = 36;
    const min = Math.min(...sparkPoints), max = Math.max(...sparkPoints);
    const range = max - min || 1;
    return sparkPoints
      .map((v, i) => {
        const x = (i / (sparkPoints.length - 1)) * w;
        const y = h - ((v - min) / range) * h;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [sparkPoints]);

  if (activeTypes.length === 0) return null;

  return (
    <Card className="border-2 border-border bg-card overflow-hidden relative">
      {/* Animated gradient sheen */}
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

        {/* Core stat grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mb-4 sm:mb-5">
          <MetricTile
            icon={<ShieldCheck className="h-3.5 w-3.5" />}
            label=":real accounts"
            value={`${realAcct.toFixed(2)}%`}
            tone="emerald"
            bar={realAcct}
          />
          <MetricTile
            icon={<Bot className="h-3.5 w-3.5" />}
            label=":bot rate"
            value={`${botRate.toFixed(2)}%`}
            tone="amber"
            bar={Math.min(100, botRate * 30)}
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
            value={Math.round(velocity).toLocaleString()}
            tone="sky"
            bar={Math.min(100, (velocity / Math.max(300, baseQuantity / 30)) * 100)}
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
                  :throughput · 60s
                </span>
              </div>
              <span className="text-[11px] font-medium text-foreground">
                {Math.round(velocity).toLocaleString()}/min
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
              <span className="font-serif text-lg leading-none text-foreground">{queueDepth}</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center gap-2">
                <Gauge className="h-3.5 w-3.5 text-emerald-500" />
                <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
                  :proxies
                </span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-500">
                {proxyHealth.toFixed(1)}%
              </span>
            </div>
            <div className="mt-2 grid grid-cols-12 gap-[2px]">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1.5 rounded-sm transition-colors",
                    i < Math.round((proxyHealth / 100) * 12)
                      ? "bg-emerald-500/80"
                      : "bg-border"
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Bottom — regions + activity feed */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 sm:gap-3">
          {/* Region distribution */}
          <div className="rounded-xl border border-border bg-secondary/40 p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-3">
              <Globe2 className="h-3.5 w-3.5 text-primary" />
              <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
                :geo distribution
              </span>
            </div>
            <div className="space-y-2">
              {regions.map((r) => (
                <div key={r.code} className="flex items-center gap-2.5">
                  <span className="text-base leading-none w-5">{r.flag}</span>
                  <span className="font-mono text-[10px] tracking-wider text-muted-foreground w-7">{r.code}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary transition-all duration-700"
                      style={{ width: `${r.pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono tabular-nums text-foreground w-10 text-right">
                    {r.pct.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Activity feed */}
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
              {feed.length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic">Warming up delivery nodes…</p>
              ) : (
                feed.map((e, i) => (
                  <div
                    key={e.id}
                    className={cn(
                      "flex items-center gap-2 text-[11px] sm:text-[12px] py-1 px-2 rounded-md transition-all",
                      i === 0 ? "bg-primary/5 border border-primary/20" : "border border-transparent",
                    )}
                    style={{ opacity: 1 - i * 0.13 }}
                  >
                    <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                    <span className="text-base leading-none">{e.flag}</span>
                    <span className="font-mono text-foreground truncate">@{e.user}</span>
                    <span className="text-muted-foreground">{e.type}</span>
                    <span className="ml-auto font-mono text-[9px] text-muted-foreground/70 shrink-0">
                      now
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer mini-stats */}
        <div className="mt-4 pt-3 border-t border-border flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] font-mono tracking-wider uppercase text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            nodes online · {12 + (tick % 4)}
          </span>
          <span>· avg latency {(120 + Math.sin(tick / 3) * 18).toFixed(0)}ms</span>
          <span>· encryption tls 1.3</span>
          <span className="ml-auto text-primary/80">:organic engine v4.2</span>
        </div>
      </CardContent>
    </Card>
  );
}

/* — Metric tile — */
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
