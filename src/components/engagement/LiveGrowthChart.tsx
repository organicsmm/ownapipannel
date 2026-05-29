import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  DEFAULT_ORGANIC_SETTINGS,
  ENGAGEMENT_CONFIG,
  EngagementConfig,
  EngagementType,
} from "@/lib/engagement-types";
import {
  formatDuration,
  generateOrganicSchedule,
  PROVIDER_MINIMUMS,
} from "@/lib/organic-algorithm";
import {
  getTemplateById,
  getTemplateCount,
  getRandomTemplate,
  searchTemplates,
  PatternStyle,
  PatternConfig,
  OrganicTemplate,
  ALL_PATTERNS,
} from "@/lib/organic-pattern-library";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Activity, Clock, RefreshCw, Sparkles, TrendingUp, Zap, Search, Hash } from "lucide-react";

type Platform = 'instagram' | 'tiktok' | 'youtube' | 'twitter' | 'facebook';

interface LiveGrowthChartProps {
  engagements: Record<EngagementType, EngagementConfig>;
  refreshKey?: number; // Triggers regeneration when changed
  onRefresh?: () => void; // Callback to request new pattern
  platform?: Platform; // Platform-specific pattern weights
  templateId?: number; // Specific template ID to use
  onTemplateChange?: (templateId: number) => void; // Callback when template changes
}

type VisibleType = Extract<EngagementType, "views" | "likes" | "comments" | "saves" | "shares">;

interface ChartDataPoint {
  time: string;
  timestamp: number;
  views: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  total: number;
  // Normalized values (0-100% of each type's target)
  views_norm: number;
  likes_norm: number;
  comments_norm: number;
  saves_norm: number;
  shares_norm: number;
}

// Distinct vibrant colors for each engagement type (exception to monochrome theme for indicators)
const TYPE_COLORS: Record<VisibleType, string> = {
  views: "#60a5fa",    // Blue-400
  comments: "#34d399", // Emerald-400
  likes: "#4ade80",    // Pink-400
  saves: "#fbbf24",    // Amber-400
  shares: "#a78bfa",   // Violet-400
};

// Line patterns (helps distinguish types even in monochrome)
const STROKE_DASH: Record<VisibleType, string | undefined> = {
  views: undefined,
  comments: "6 3",
  likes: "2 2",
  saves: "10 4",
  shares: "4 6",
};

// Sorted visual priority (keeps Likes in 3rd position as per UI memory)
const VISIBLE_PRIORITY: VisibleType[] = ["views", "comments", "likes", "saves", "shares"];

// -------- seeded randomness (stable per config; prevents flicker) --------
const hashString = (str: string) => {
  // FNV-1a-ish (fast, deterministic)
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

// Hard caps to prevent UI freeze for very large quantities (preview only)
// Scaled up to support 600K+ views
const PREVIEW_LIMITS = {
  maxMicroStepsPerRun: 220,
  maxEvents: 6000,
  maxChartPoints: 1500,
} as const;

// -------- PLATFORM-SPECIFIC PATTERN WEIGHTS --------
// Each platform has its own unique pattern preferences for organic delivery
const PLATFORM_PATTERN_WEIGHTS: Record<Platform, Partial<Record<PatternStyle, number>>> = {
  instagram: {
    // Instagram: Aesthetic, story-driven engagement patterns
    'smooth-s-curve': 3, 'wave-pattern': 2.5, 'gradual-accelerate': 2,
    'double-peak': 2, 'early-peak': 2, 'viral-spike': 1.5,
    'roller-coaster': 1.5, 'plateau-heavy': 1.5
  },
  tiktok: {
    // TikTok: Fast, viral, explosive growth patterns
    'viral-spike': 4, 'exponential-burst': 3, 'hockey-stick': 3,
    'mega-burst': 2.5, 'burst-pause-burst': 2, 'chaotic-organic': 2,
    'roller-coaster': 2, 'delayed-explosion': 1.5
  },
  youtube: {
    // YouTube: Long-form, steady growth with occasional spikes
    'slow-steady': 3, 'gradual-accelerate': 3, 'smooth-s-curve': 2.5,
    'logarithmic-fade': 2, 'plateau-heavy': 2, 'staircase': 1.5,
    'stepped-growth': 1.5, 'hockey-stick': 1.5
  },
  twitter: {
    // Twitter: Rapid, bursty, trending patterns
    'viral-spike': 3.5, 'burst-pause-burst': 3, 'micro-burst': 2.5,
    'exponential-burst': 2, 'chaotic-organic': 2, 'double-peak': 2,
    'early-peak': 1.5, 'roller-coaster': 1.5
  },
  facebook: {
    // Facebook: Community-driven, steady engagement
    'slow-steady': 3, 'stepped-growth': 2.5, 'gradual-accelerate': 2.5,
    'plateau-heavy': 2, 'wave-pattern': 2, 'smooth-s-curve': 2,
    'delayed-explosion': 1.5, 'staircase': 1.5
  }
};

// Get random pattern for a type based on seed, platform, and optional template
const getPatternForType = (
  type: VisibleType, 
  rand: () => number,
  platform: Platform = 'instagram',
  templateConfig?: PatternConfig
): PatternStyle => {
  // If template config is provided, use its pattern characteristics to determine style
  if (templateConfig) {
    // The template already has the pattern style embedded via config
    // We derive the pattern from config characteristics
    return inferPatternFromConfig(templateConfig, rand);
  }

  // Type-specific base weights
  const typeWeights: Record<VisibleType, Partial<Record<PatternStyle, number>>> = {
    views: { 
      'smooth-s-curve': 2, 'exponential-burst': 3, 'viral-spike': 2, 
      'hockey-stick': 2, 'gradual-accelerate': 2, 'wave-pattern': 1.5 
    },
    likes: { 
      'delayed-explosion': 2, 'burst-pause-burst': 3, 'stepped-growth': 2, 
      'double-peak': 2, 'chaotic-organic': 1.5, 'roller-coaster': 1.5 
    },
    comments: { 
      'micro-burst': 3, 'plateau-heavy': 2, 'slow-steady': 2, 
      'staircase': 2, 'logarithmic-fade': 1.5, 'early-peak': 1.5 
    },
    saves: { 
      'stepped-growth': 2, 'gradual-accelerate': 2, 'plateau-heavy': 2, 
      'burst-pause-burst': 1.5, 'delayed-explosion': 1.5, 'wave-pattern': 1.5 
    },
    shares: { 
      'viral-spike': 3, 'mega-burst': 2, 'exponential-burst': 2, 
      'roller-coaster': 2, 'double-peak': 1.5, 'chaotic-organic': 1.5 
    },
  };

  // Combine platform weights with type weights (multiplicative)
  const platformWeights = PLATFORM_PATTERN_WEIGHTS[platform];
  const baseTypeWeights = typeWeights[type];
  
  const patterns = ALL_PATTERNS.map(p => {
    const platformWeight = platformWeights[p] ?? 1.0;
    const typeWeight = baseTypeWeights[p] ?? 1.0;
    // Multiply weights for combined effect (platform + type preference)
    return {
      pattern: p,
      weight: platformWeight * typeWeight
    };
  });
  
  const totalWeight = patterns.reduce((sum, p) => sum + p.weight, 0);
  let pick = rand() * totalWeight;
  
  for (const { pattern, weight } of patterns) {
    pick -= weight;
    if (pick <= 0) return pattern;
  }
  
  return ALL_PATTERNS[Math.floor(rand() * ALL_PATTERNS.length)];
};

// Infer pattern style from config characteristics
function inferPatternFromConfig(config: PatternConfig, rand: () => number): PatternStyle {
  // Use config characteristics to pick appropriate pattern
  if (config.curveShape > 3) return 'exponential-burst';
  if (config.curveShape < 0.5) return 'logarithmic-fade';
  if (config.burstChance > 0.7) return 'viral-spike';
  if (config.pauseChance > 0.7) return 'plateau-heavy';
  if (config.microSteps[1] > 40) return 'micro-burst';
  if (config.microSteps[1] < 8) return 'mega-burst';
  if (config.dipChance > 0.4) return 'roller-coaster';
  if (config.clusterChance > 0.7) return 'staircase';
  return 'smooth-s-curve';
}

// Dynamic shape generator based on pattern style - uses library configs
const getShapeForPattern = (pattern: PatternStyle, type: VisibleType, rand: () => number, templateConfig?: PatternConfig) => {
  // Fallback config for patterns not in library (for backwards compatibility)
  const fallbackConfig: PatternConfig = {
    microSteps: [10, 25], clusterChance: 0.3, pauseChance: 0.4,
    timeJitterMs: [3*60_000, 20*60_000], gradualFactor: 2.5, dipChance: 0.2,
    burstChance: 0.2, plateauDuration: 1.0, curveShape: 1.0
  };

  // Use template config if provided, otherwise try to get from pattern library
  let base: PatternConfig = templateConfig || fallbackConfig;
  
  if (!templateConfig) {
    // Try to get a matching template from library
    const templates = searchTemplates(pattern);
    if (templates.length > 0) {
      base = templates[0].config;
    }
  }
  
  // Add per-type adjustments + random variation (±20%)
  const variation = () => 0.8 + rand() * 0.4;
  
  const typeMaxBurst: Record<VisibleType, number> = {
    views: 30, likes: 10, comments: 3, saves: 6, shares: 4
  };
  
  return {
    microSteps: [
      Math.round(base.microSteps[0] * variation()),
      Math.round(base.microSteps[1] * variation())
    ] as [number, number],
    clusterChance: clamp(base.clusterChance * variation(), 0.05, 0.95),
    pauseChance: clamp(base.pauseChance * variation(), 0.1, 0.9),
    timeJitterMs: [
      Math.round(base.timeJitterMs[0] * variation()),
      Math.round(base.timeJitterMs[1] * variation())
    ] as [number, number],
    gradualFactor: base.gradualFactor * variation(),
    dipChance: clamp(base.dipChance * variation(), 0.02, 0.6),
    burstChance: clamp(base.burstChance * variation(), 0.02, 0.9),
    plateauDuration: base.plateauDuration * variation(),
    curveShape: base.curveShape * (0.7 + rand() * 0.6),
    maxPerMicroBurst: Math.max(1, Math.round(typeMaxBurst[type] * variation())),
    pattern, // Store pattern for debugging
  };
};

type MicroEvent = { time: Date; type: VisibleType; qty: number };


const buildMicroEventsForRun = (
  type: VisibleType,
  runTime: Date,
  runQty: number,
  rand: () => number,
  shapeOverride?: ReturnType<typeof getShapeForPattern>
): MicroEvent[] => {
  if (runQty <= 0) return [];

  // Use provided shape or generate a random one
  const shape = shapeOverride ?? getShapeForPattern(
    getPatternForType(type, rand),
    type,
    rand
  );
  
  const [minSteps, maxSteps] = shape.microSteps;

  // ULTRA ORGANIC: many micro-bursts, but cap for UI performance
  const minRequiredSteps = Math.ceil(runQty / shape.maxPerMicroBurst);

  const volumeBoost = Math.floor(Math.log10(runQty + 10) * shape.gradualFactor);
  const typeBoost = type === "views" ? 8 : type === "likes" ? 5 : type === "comments" ? 3 : 2;
  const baseSteps = Math.floor(minSteps + rand() * (maxSteps - minSteps + 1));

  let steps = Math.max(minRequiredSteps, baseSteps + volumeBoost + typeBoost);
  steps = Math.min(steps, PREVIEW_LIMITS.maxMicroStepsPerRun);

  // If we cap steps, increase max-per-burst so we can still sum to total
  const maxPerBurst = Math.max(shape.maxPerMicroBurst, Math.ceil(runQty / Math.max(steps, 1)));

  const parts = splitQuantityUltraOrganic(runQty, steps, maxPerBurst, rand);

  // Scale time spread with volume - longer spread for larger quantities
  const [jMinBase, jMaxBase] = shape.timeJitterMs;
  const spreadMultiplier = clamp(1 + Math.log10(runQty + 10) * shape.gradualFactor / 2, 1.5, 5.0);
  const jMin = jMinBase * spreadMultiplier;
  const jMax = jMaxBase * spreadMultiplier;

  const events: MicroEvent[] = [];
  let cumulativeTime = runTime.getTime();

  // Apply curve shape (exponential/logarithmic transformation)
  const curveShape = shape.curveShape;
  const applyProgress = (i: number, total: number) => {
    const progress = i / Math.max(total - 1, 1);
    // curveShape < 1 = logarithmic (fast start), > 1 = exponential (slow start)
    return Math.pow(progress, curveShape);
  };

  for (let i = 0; i < parts.length; i++) {
    const qty = parts[i];
    const progressCurve = applyProgress(i, parts.length);

    // Progressive time spacing based on curve shape
    const progressFactor = 0.5 + progressCurve * 1.5;
    const timeOffset = (jMin + rand() * (jMax - jMin)) * progressFactor;

    // Add natural pauses based on pattern
    const hasPause = rand() < shape.pauseChance * 0.3 * shape.plateauDuration;
    const pauseTime = hasPause ? (15 * 60_000 + rand() * 45 * 60_000) * shape.plateauDuration : 0;

    // Add bursts (sudden acceleration)
    const hasBurst = rand() < shape.burstChance * 0.2;
    const burstMultiplier = hasBurst ? 0.3 + rand() * 0.4 : 1;

    // Add dips (slower periods)
    const hasDip = rand() < shape.dipChance;
    const dipMultiplier = hasDip ? 1.5 + rand() * 1.0 : 1;

    cumulativeTime += (timeOffset * burstMultiplier + pauseTime) * dipMultiplier;

    // Small random jitter to avoid perfect spacing
    const microJitter = (rand() - 0.5) * 3 * 60_000; // ±3 minutes
    const eventTime = new Date(cumulativeTime + microJitter);

    events.push({ time: eventTime, type, qty });
  }

  events.sort((a, b) => a.time.getTime() - b.time.getTime());
  return events;
};

// ULTRA ORGANIC quantity splitting - ensures no single burst is too large
const splitQuantityUltraOrganic = (
  total: number,
  parts: number,
  maxPerBurst: number,
  rand: () => number
): number[] => {
  if (total <= 0 || parts <= 0) return [];

  // Hard cap for preview performance (prevents huge arrays + O(total) loops)
  const safeParts = Math.max(1, Math.min(parts, 5000));

  // Start with random weights
  const weights = Array.from({ length: safeParts }, () => 0.3 + rand() * 1.4);
  const sum = weights.reduce((a, b) => a + b, 0);

  // Initial distribution (bounded)
  let raw = weights.map((w) => {
    const v = Math.max(1, Math.floor((w / sum) * total));
    return Math.min(v, maxPerBurst);
  });

  // Ensure total matches (fast redistribution)
  let currentTotal = raw.reduce((a, b) => a + b, 0);
  let diff = total - currentTotal;

  const maxPasses = raw.length * 3; // bounded work
  let passes = 0;

  // Add remaining quantity (in chunks)
  while (diff > 0 && passes < maxPasses) {
    const idx = Math.floor(rand() * raw.length);
    const capacity = maxPerBurst - raw[idx];
    if (capacity <= 0) {
      passes++;
      continue;
    }

    const chunk = Math.min(diff, capacity, Math.max(1, Math.floor(diff / raw.length)));
    raw[idx] += chunk;
    diff -= chunk;
    passes++;
  }

  // If still diff remains, append new micro-bursts
  while (diff > 0) {
    const add = Math.min(diff, maxPerBurst);
    raw.push(add);
    diff -= add;
  }

  // Remove excess quantity (in chunks)
  passes = 0;
  while (diff < 0 && passes < maxPasses) {
    const idx = Math.floor(rand() * raw.length);
    const removable = raw[idx] - 1;
    if (removable <= 0) {
      passes++;
      continue;
    }

    const chunk = Math.min(-diff, removable, Math.max(1, Math.floor((-diff) / raw.length)));
    raw[idx] -= chunk;
    diff += chunk;
    passes++;
  }

  // Final safety: if we still couldn't remove enough, trim from the end
  while (diff < 0) {
    const idx = raw.length - 1;
    const removable = raw[idx] - 1;
    if (removable <= 0) break;
    const chunk = Math.min(-diff, removable);
    raw[idx] -= chunk;
    diff += chunk;
  }

  // Shuffle to avoid predictable patterns
  for (let i = raw.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [raw[i], raw[j]] = [raw[j], raw[i]];
  }

  return raw;
};

export function LiveGrowthChart({ 
  engagements, 
  refreshKey = 0, 
  onRefresh, 
  platform = 'instagram',
  templateId: initialTemplateId,
  onTemplateChange 
}: LiveGrowthChartProps) {
  // Raw absolute values mode - shows actual quantities like 10K, 5K etc.
  const chartMode = 'raw' as const;
  
  // Template search state
  const [templateSearch, setTemplateSearch] = useState('');
  const [activeTemplateId, setActiveTemplateId] = useState<number | undefined>(initialTemplateId);
  
  // Get current template info
  const currentTemplate = activeTemplateId ? getTemplateById(activeTemplateId) : undefined;
  const totalTemplates = getTemplateCount();

  // Handle template search
  const handleTemplateSearch = (value: string) => {
    setTemplateSearch(value);
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 1 && numValue <= totalTemplates) {
      setActiveTemplateId(numValue);
      onTemplateChange?.(numValue);
    }
  };

  // Generate random template ID
  const handleRandomTemplate = () => {
    const newId = Math.floor(Math.random() * totalTemplates) + 1;
    setActiveTemplateId(newId);
    setTemplateSearch(newId.toString());
    onTemplateChange?.(newId);
    onRefresh?.();
  };

  // Stabilize engagements dependency - only recompute when actual values change
  const engagementsKey = useMemo(() => {
    return VISIBLE_PRIORITY
      .filter(t => engagements[t]?.enabled && (engagements[t]?.quantity ?? 0) > 0)
      .map(t => {
        const c = engagements[t];
        return `${t}:${c.quantity}:${c.timeLimitHours ?? 0}:${c.variancePercent ?? 0}:${c.peakHoursEnabled ?? false}:${c.minQuantity ?? 0}`;
      })
      .join('|');
  }, [engagements]);

  const { chartData, stats, typeBreakdown, organicScore, platformUsed, usedTemplateId } = useMemo(() => {
    const enabledVisible = VISIBLE_PRIORITY.filter(
      (t) => engagements[t]?.enabled && (engagements[t]?.quantity ?? 0) > 0
    ).map((type) => ({ type, config: engagements[type] }));

    if (enabledVisible.length === 0) {
      return { chartData: [], stats: null, typeBreakdown: [], organicScore: 0, platformUsed: platform, usedTemplateId: undefined };
    }

    // Determine template to use
    let templateToUse: OrganicTemplate | undefined = undefined;
    let effectiveTemplateId: number | undefined = activeTemplateId;
    
    if (activeTemplateId) {
      templateToUse = getTemplateById(activeTemplateId);
    } else {
      // Generate a random template based on refreshKey for consistency
      const randomTemplate = getRandomTemplate(refreshKey + hashString(platform));
      templateToUse = randomTemplate;
      effectiveTemplateId = randomTemplate.id;
    }

    // Seed from current configuration + refreshKey + platform + templateId so chart regenerates on refresh
    const seedString = enabledVisible
      .map(({ type, config }) => {
        const tl = config.timeLimitHours ?? DEFAULT_ORGANIC_SETTINGS.timeLimitHours;
        const varp = config.variancePercent ?? DEFAULT_ORGANIC_SETTINGS.variancePercent;
        const peak = config.peakHoursEnabled ?? DEFAULT_ORGANIC_SETTINGS.peakHoursEnabled;
        return `${type}:${config.quantity}:${tl}:${varp}:${peak}:${config.minQuantity ?? 0}`;
      })
      .join("|") + `|refresh:${refreshKey}|platform:${platform}|template:${effectiveTemplateId || 0}`;

    const rand = mulberry32(hashString(seedString));

    const startTime = new Date();

    // Generate base schedule per type (service-aware), then explode each run into micro-events
    const allEvents: MicroEvent[] = [];
    let totalRuns = 0;
    
    // Pre-generate unique pattern shape for each type WITH PLATFORM and TEMPLATE (consistent within this refresh)
    const typeShapes: Record<VisibleType, ReturnType<typeof getShapeForPattern>> = {} as any;
    enabledVisible.forEach(({ type }) => {
      // Use template config if available, otherwise platform-specific pattern selection
      if (templateToUse) {
        const pattern = templateToUse.style as PatternStyle;
        typeShapes[type] = getShapeForPattern(pattern, type, rand, templateToUse.config);
      } else {
        const pattern = getPatternForType(type, rand, platform);
        typeShapes[type] = getShapeForPattern(pattern, type, rand);
      }
    });

    enabledVisible.forEach(({ type, config }) => {
      const timeLimitHours = config.timeLimitHours ?? DEFAULT_ORGANIC_SETTINGS.timeLimitHours;
      const variancePercent = config.variancePercent ?? DEFAULT_ORGANIC_SETTINGS.variancePercent;
      const peakHoursEnabled = config.peakHoursEnabled ?? DEFAULT_ORGANIC_SETTINGS.peakHoursEnabled;
      const serviceMinimum = config.minQuantity || PROVIDER_MINIMUMS[type] || 10;

      const schedule = generateOrganicSchedule(
        type,
        config.quantity,
        variancePercent,
        peakHoursEnabled,
        startTime,
        serviceMinimum,
        timeLimitHours > 0 ? timeLimitHours : undefined
      );

      totalRuns += schedule.runs.length;

      // Use the pre-generated shape for this type (consistent pattern per refresh)
      const typeShape = typeShapes[type];

      schedule.runs.forEach((r) => {
        // Convert each scheduled run into irregular micro-bursts with unique pattern
        allEvents.push(
          ...buildMicroEventsForRun(type, r.scheduledAt, r.quantity, rand, typeShape)
        );
      });
    });

    allEvents.sort((a, b) => a.time.getTime() - b.time.getTime());

    // If the preview becomes too heavy (large quantities), compress events into time buckets
    let events: MicroEvent[] = allEvents;
    if (events.length > PREVIEW_LIMITS.maxEvents) {
      const firstTs = events[0]?.time.getTime() ?? startTime.getTime();
      const lastTs = events[events.length - 1]?.time.getTime() ?? startTime.getTime();
      const durationMs = Math.max(1, lastTs - firstTs);

      // Aim for <= maxEvents after compression, rounded to a full minute
      const rawBucketMs = Math.ceil(durationMs / PREVIEW_LIMITS.maxEvents);
      const bucketMs = Math.max(60_000, Math.ceil(rawBucketMs / 60_000) * 60_000);

      const buckets = new Map<number, Record<VisibleType, number>>();
      const empty = (): Record<VisibleType, number> => ({
        views: 0,
        likes: 0,
        comments: 0,
        saves: 0,
        shares: 0,
      });

      for (const ev of events) {
        const key = Math.floor(ev.time.getTime() / bucketMs) * bucketMs;
        const acc = buckets.get(key) ?? empty();
        acc[ev.type] += ev.qty;
        buckets.set(key, acc);
      }

      const compressed: MicroEvent[] = [];
      const keys = [...buckets.keys()].sort((a, b) => a - b);
      for (const ts of keys) {
        const sums = buckets.get(ts)!;
        ("views,likes,comments,saves,shares".split(",") as VisibleType[]).forEach((t) => {
          const qty = sums[t];
          if (qty > 0) compressed.push({ time: new Date(ts), type: t, qty });
        });
      }

      events = compressed;
    }

    if (events.length === 0) {
      return { chartData: [], stats: null, typeBreakdown: [], organicScore: 0 };
    }

    // Build cumulative series across time (irregular steps + plateaus)
    const cumulative: Record<VisibleType, number> = {
      views: 0,
      likes: 0,
      comments: 0,
      saves: 0,
      shares: 0,
    };

    let chartData: ChartDataPoint[] = [];

    // Build target map for normalization
    const targetMap: Record<VisibleType, number> = { views: 0, likes: 0, comments: 0, saves: 0, shares: 0 };
    enabledVisible.forEach(({ type, config }) => { targetMap[type] = Math.max(1, config.quantity); });

    const pushPoint = (t: Date) => {
      const total = cumulative.views + cumulative.likes + cumulative.comments + cumulative.saves + cumulative.shares;
      chartData.push({
        time: format(t, "HH:mm"),
        timestamp: t.getTime(),
        views: cumulative.views,
        likes: cumulative.likes,
        comments: cumulative.comments,
        saves: cumulative.saves,
        shares: cumulative.shares,
        total,
        views_norm: (cumulative.views / targetMap.views) * 100 || 0,
        likes_norm: (cumulative.likes / targetMap.likes) * 100 || 0,
        comments_norm: (cumulative.comments / targetMap.comments) * 100 || 0,
        saves_norm: (cumulative.saves / targetMap.saves) * 100 || 0,
        shares_norm: (cumulative.shares / targetMap.shares) * 100 || 0,
      });
    };

    pushPoint(startTime);

    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      const prevTime = new Date(chartData[chartData.length - 1].timestamp);
      const diff = ev.time.getTime() - prevTime.getTime();

      // Insert plateau points for larger gaps (organic pauses)
      if (diff > 6 * 60_000 && rand() < 0.75) {
        const midCount = clamp(Math.floor(1 + rand() * 3), 1, 3);
        for (let m = 1; m <= midCount; m++) {
          const mid = new Date(prevTime.getTime() + (diff * m) / (midCount + 1));
          // tiny time jitter so x-axis isn't perfectly uniform
          const nudge = (rand() - 0.5) * 90_000;
          pushPoint(new Date(mid.getTime() + nudge));
        }
      }

      cumulative[ev.type] += ev.qty;
      pushPoint(ev.time);
    }

    // Ensure chronological order (nudges can disorder)
    chartData.sort((a, b) => a.timestamp - b.timestamp);

    // Cap points for Recharts performance
    if (chartData.length > PREVIEW_LIMITS.maxChartPoints) {
      const step = Math.ceil(chartData.length / PREVIEW_LIMITS.maxChartPoints);
      chartData = chartData.filter((_, idx) => idx % step === 0 || idx === chartData.length - 1);
    }

    // Stats + breakdown
    const end = chartData[chartData.length - 1].timestamp;
    const duration = Math.max(0, (end - startTime.getTime()) / 1000);
    const totalEngagements = enabledVisible.reduce((sum, { config }) => sum + config.quantity, 0);

    const typeBreakdown = enabledVisible.map(({ type, config }) => ({
      type,
      quantity: cumulative[type],
      target: config.quantity,
    }));

    // Organic indicator (based on variability + penalty for huge single jumps)
    const avgVariance = enabledVisible.reduce(
      (sum, { config }) => sum + (config.variancePercent ?? DEFAULT_ORGANIC_SETTINGS.variancePercent),
      0
    ) / enabledVisible.length;

    // Use TOTAL deltas (not just views) so indicator matches what user sees
    const totalDeltas: number[] = [];
    for (let i = 1; i < chartData.length; i++) {
      const d = chartData[i].total - chartData[i - 1].total;
      if (d > 0) totalDeltas.push(d);
    }

    const mean = totalDeltas.length ? totalDeltas.reduce((a, b) => a + b, 0) / totalDeltas.length : 0;
    const variance = totalDeltas.length
      ? totalDeltas.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / totalDeltas.length
      : 0;
    const std = Math.sqrt(variance);
    const cv = mean > 0 ? std / mean : 0;

    const maxDelta = totalDeltas.length ? Math.max(...totalDeltas) : 0;
    const maxJumpRatio = mean > 0 ? maxDelta / mean : 0;
    const jumpPenalty = Math.max(0, (maxJumpRatio - 4)) * 6; // penalize "walls"

    const organicScore = Math.round(clamp(70 + cv * 50 + (avgVariance - 25) * 0.6 - jumpPenalty, 55, 99));

    return {
      chartData,
      stats: { totalRuns, totalEngagements, duration },
      typeBreakdown,
      organicScore,
      platformUsed: platform,
      usedTemplateId: effectiveTemplateId,
    };
  }, [engagementsKey, refreshKey, platform, activeTemplateId]);

  if (chartData.length <= 1) return null;

  const activeTypes = VISIBLE_PRIORITY.filter(
    (t) => engagements[t]?.enabled && (engagements[t]?.quantity ?? 0) > 0
  );

  return (
    <Card className="relative border border-primary/20 bg-background overflow-hidden shadow-[0_20px_80px_-30px_hsl(var(--primary)/0.35)]">
      {/* Ambient glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 60% 40% at 0% 0%, hsl(var(--primary) / 0.10), transparent 60%), radial-gradient(ellipse 50% 40% at 100% 100%, hsl(var(--primary) / 0.08), transparent 60%)' }} />
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: 'linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      {/* HUD top strip */}
      <div className="relative flex items-center justify-between px-4 sm:px-6 py-2.5 border-b border-border bg-card/40 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
          </span>
          <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-primary">live · broadcasting</span>
          <span className="hidden sm:inline font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">· {platform}</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] uppercase">
          <span className="text-muted-foreground hidden sm:inline">organic</span>
          <span className="text-primary font-bold">{organicScore}%</span>
        </div>
      </div>

      <CardHeader className="relative pb-3 pt-4">
        <CardTitle className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
          <div className="flex-1 min-w-0">
            <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground mb-1">
              :preview / organic_delivery_simulation
            </p>
            <h3 className="font-serif text-2xl sm:text-3xl tracking-tight text-foreground leading-tight">
              Live Organic <span className="italic text-primary">Growth Engine</span>
            </h3>
          </div>
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRandomTemplate}
              className="h-8 px-3 gap-1.5 border-primary/30 bg-primary/5 hover:bg-primary/10 text-foreground font-mono text-[10px] uppercase tracking-[0.18em]"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              new pattern
            </Button>
          )}
        </CardTitle>

        {/* Metric tiles */}
        <div className="grid grid-cols-3 gap-px bg-border border border-border rounded-lg overflow-hidden mt-4">
          <div className="bg-background/80 p-3">
            <p className="font-mono text-[9px] tracking-[0.2em] uppercase text-muted-foreground mb-1">:total</p>
            <p className="font-serif text-xl text-foreground leading-none">{stats?.totalEngagements.toLocaleString()}</p>
            <p className="font-mono text-[9px] tracking-[0.15em] uppercase text-primary mt-1 flex items-center gap-1"><Zap className="h-2.5 w-2.5" /> engage</p>
          </div>
          <div className="bg-background/80 p-3">
            <p className="font-mono text-[9px] tracking-[0.2em] uppercase text-muted-foreground mb-1">:runs</p>
            <p className="font-serif text-xl text-foreground leading-none">{stats?.totalRuns}</p>
            <p className="font-mono text-[9px] tracking-[0.15em] uppercase text-primary mt-1 flex items-center gap-1"><TrendingUp className="h-2.5 w-2.5" /> bursts</p>
          </div>
          <div className="bg-background/80 p-3">
            <p className="font-mono text-[9px] tracking-[0.2em] uppercase text-muted-foreground mb-1">:eta</p>
            <p className="font-serif text-xl text-foreground leading-none">~{formatDuration(stats?.duration || 0)}</p>
            <p className="font-mono text-[9px] tracking-[0.15em] uppercase text-primary mt-1 flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> duration</p>
          </div>
        </div>

        {/* Template chip */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary/40 border border-border">
            <Hash className="h-3 w-3 text-primary" />
            <Input
              type="number"
              placeholder={`1-${totalTemplates}`}
              value={templateSearch || usedTemplateId || ''}
              onChange={(e) => handleTemplateSearch(e.target.value)}
              className="h-5 w-14 text-[10px] font-mono p-0 border-0 bg-transparent shadow-none focus-visible:ring-0"
              min={1}
              max={totalTemplates}
            />
            {(currentTemplate || usedTemplateId) && (
              <span className="font-mono text-[9px] uppercase tracking-wider text-primary">
                · {currentTemplate?.style || 'custom'}
              </span>
            )}
          </div>
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground ml-auto">
            {totalTemplates}+ patterns indexed
          </span>
        </div>
      </CardHeader>

      <CardContent className="relative p-3 sm:p-6 pt-2">
        <div className="relative h-[320px] w-full rounded-lg overflow-hidden bg-card/20 border border-border/60">
          {/* Corner ticks */}
          <span aria-hidden className="absolute top-2 left-2 w-3 h-3 border-l border-t border-primary/60 z-10" />
          <span aria-hidden className="absolute top-2 right-2 w-3 h-3 border-r border-t border-primary/60 z-10" />
          <span aria-hidden className="absolute bottom-2 left-2 w-3 h-3 border-l border-b border-primary/60 z-10" />
          <span aria-hidden className="absolute bottom-2 right-2 w-3 h-3 border-r border-b border-primary/60 z-10" />

          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 16, right: 16, left: 4, bottom: 4 }}>
              <defs>
                {activeTypes.map((type) => (
                  <linearGradient key={type} id={`grad-${type}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={TYPE_COLORS[type]} stopOpacity={0.55} />
                    <stop offset="45%" stopColor={TYPE_COLORS[type]} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={TYPE_COLORS[type]} stopOpacity={0.02} />
                  </linearGradient>
                ))}
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.15} vertical={false} />

              <XAxis
                dataKey="timestamp"
                type="number"
                scale="time"
                domain={["dataMin", "dataMax"]}
                stroke="hsl(var(--muted-foreground))"
                fontSize={9}
                tickLine={false}
                axisLine={false}
                tickCount={6}
                minTickGap={28}
                tickFormatter={(ts) => format(new Date(Number(ts)), "HH:mm")}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                width={45}
                domain={undefined}
                tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}K` : value}
              />

              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const ts = typeof label === "number" ? label : Number(label);
                  const dataPoint = chartData.find(d => d.timestamp === ts);
                  return (
                    <div className="bg-background/95 backdrop-blur-sm border border-primary/40 rounded-md p-3 shadow-xl">
                      <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">
                        {Number.isFinite(ts) ? format(new Date(ts), "HH:mm") : String(label)}
                      </p>
                      {payload
                        .filter((p) => (p.value as number) > 0)
                        .map((entry, idx) => {
                          const rawKey = (entry.dataKey as string).replace('_norm', '') as VisibleType;
                          const cfg = ENGAGEMENT_CONFIG[rawKey];
                          const actualValue = dataPoint ? dataPoint[rawKey] : (entry.value as number);
                          return (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color as string }} />
                              <span>{cfg?.emoji}</span>
                              <span className="font-bold">{actualValue.toLocaleString()}</span>
                            </div>
                          );
                        })}
                    </div>
                  );
                }}
              />

              {activeTypes.map((type) => (
                <Area
                  key={type}
                  type="linear"
                  dataKey={type}
                  stroke={TYPE_COLORS[type]}
                  strokeDasharray={STROKE_DASH[type]}
                  strokeWidth={type === "views" ? 2.5 : 1.8}
                  fill={`url(#grad-${type})`}
                  fillOpacity={1}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: TYPE_COLORS[type], fill: "hsl(var(--background))" }}
                  isAnimationActive={false}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Type breakdown HUD */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mt-4">
          {typeBreakdown.map(({ type, quantity }) => {
            const cfg = ENGAGEMENT_CONFIG[type];
            return (
              <div
                key={type}
                className="relative flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-card/40 hover:border-primary/40 transition-colors"
              >
                <div className="w-1 h-8 rounded-full" style={{ backgroundColor: TYPE_COLORS[type as VisibleType] }} />
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-[9px] tracking-[0.18em] uppercase text-muted-foreground truncate">
                    {cfg?.emoji} {cfg?.label}
                  </p>
                  <p className="font-serif text-base text-foreground leading-tight">{quantity.toLocaleString()}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
