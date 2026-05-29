// Engagement Intelligence — research-backed ratios & formulas
// Based on public industry benchmarks (HypeAuditor, Influencer Marketing Hub, Later, Hootsuite 2024 reports)

export type Platform =
  | 'instagram'
  | 'youtube'
  | 'tiktok'
  | 'facebook'
  | 'twitter'
  | 'voting';

// Healthy engagement-rate benchmarks (% of views/followers)
// Source: avg public reports 2023-2024
export const ENGAGEMENT_BENCHMARKS: Record<Platform, {
  likeRate: [number, number];      // likes per 100 views (min, max healthy)
  commentRate: [number, number];   // comments per 100 views
  shareRate: [number, number];     // shares per 100 views
  saveRate: [number, number];      // saves per 100 views
  watchTime: [number, number];     // % of video watched
  followRate: [number, number];    // new followers per 100 views
}> = {
  instagram: {
    likeRate: [3, 8],
    commentRate: [0.3, 1.2],
    shareRate: [0.5, 2],
    saveRate: [1, 3.5],
    watchTime: [30, 65],
    followRate: [0.5, 2],
  },
  youtube: {
    likeRate: [2, 5],
    commentRate: [0.1, 0.6],
    shareRate: [0.2, 1],
    saveRate: [0.3, 1.2],
    watchTime: [45, 70],
    followRate: [0.4, 1.5],
  },
  tiktok: {
    likeRate: [5, 12],
    commentRate: [0.5, 2],
    shareRate: [1, 4],
    saveRate: [1.5, 5],
    watchTime: [40, 75],
    followRate: [0.8, 3],
  },
  facebook: {
    likeRate: [1, 4],
    commentRate: [0.2, 0.8],
    shareRate: [0.3, 1.5],
    saveRate: [0.2, 0.8],
    watchTime: [25, 50],
    followRate: [0.2, 1],
  },
  twitter: {
    likeRate: [1.5, 4],
    commentRate: [0.2, 0.7],
    shareRate: [0.4, 1.5],
    saveRate: [0.3, 1],
    watchTime: [20, 45],
    followRate: [0.3, 1.2],
  },
  voting: {
    likeRate: [10, 35],
    commentRate: [1, 4],
    shareRate: [2, 8],
    saveRate: [0.5, 2],
    watchTime: [30, 60],
    followRate: [0.5, 2.5],
  },
};

// Best posting times (IST 24h) per platform — researched from Sprout Social 2024
export const BEST_TIMES: Record<Platform, string[]> = {
  instagram: ['11:00–13:00', '19:00–21:00', '06:00–08:00 (weekends)'],
  youtube: ['14:00–16:00', '20:00–22:00', '10:00–12:00 (Sat/Sun)'],
  tiktok: ['06:00–10:00', '19:00–23:00', 'Tue–Thu peak'],
  facebook: ['09:00–11:00', '13:00–15:00', 'Wed–Fri'],
  twitter: ['08:00–10:00', '18:00–20:00', 'Weekday mornings'],
  voting: ['10:00–12:00', '18:00–22:00', 'Final 48h of contest = critical'],
};

// Calculate suggested engagement counts for a given view target
export function suggestEngagement(
  platform: Platform,
  views: number,
  quality: 'safe' | 'balanced' | 'aggressive' = 'balanced'
) {
  const b = ENGAGEMENT_BENCHMARKS[platform];
  const factor = quality === 'safe' ? 0 : quality === 'aggressive' ? 1 : 0.5;
  const pick = (r: [number, number]) => (r[0] + (r[1] - r[0]) * factor) / 100;

  return {
    likes: Math.round(views * pick(b.likeRate)),
    comments: Math.round(views * pick(b.commentRate)),
    shares: Math.round(views * pick(b.shareRate)),
    saves: Math.round(views * pick(b.saveRate)),
    followers: Math.round(views * pick(b.followRate)),
    watchTimePercent: Math.round(b.watchTime[0] + (b.watchTime[1] - b.watchTime[0]) * factor),
  };
}

// Voting % predictor for contest-style voting
// Given total contest votes & your bought votes → win probability
export function predictWinChance(
  yourVotes: number,
  totalContestVotes: number,
  competitors: number,
  organicGrowthFactor: number = 1.15 // organic snowball effect
) {
  if (totalContestVotes <= 0) return 0;
  const projectedYour = yourVotes * organicGrowthFactor;
  const avgCompetitor = (totalContestVotes - yourVotes) / Math.max(1, competitors);
  const ratio = projectedYour / (projectedYour + avgCompetitor);
  // Sigmoid-style confidence boost when leading by >20%
  const lead = projectedYour / Math.max(1, avgCompetitor);
  const confidence = 1 / (1 + Math.exp(-2 * (lead - 1)));
  return Math.min(99, Math.round(ratio * 60 + confidence * 40));
}

// Required votes to hit target win-chance
export function votesNeededForWinChance(
  targetWinPercent: number,
  totalContestVotes: number,
  competitors: number,
  currentVotes: number = 0
) {
  // Binary search
  let lo = currentVotes, hi = totalContestVotes * 5;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const chance = predictWinChance(mid, totalContestVotes + (mid - currentVotes), competitors);
    if (chance >= targetWinPercent) hi = mid;
    else lo = mid + 1;
  }
  return Math.max(0, lo - currentVotes);
}

// Organic-looking drip schedule
export function buildDripSchedule(totalQty: number, hours: number) {
  const runs = Math.min(hours * 4, 48); // up to 48 runs
  const perRun = Math.ceil(totalQty / runs);
  const schedule: { hour: number; qty: number; label: string }[] = [];
  let remaining = totalQty;
  for (let i = 0; i < runs && remaining > 0; i++) {
    // Bell-curve weighting: peak in middle
    const t = i / runs;
    const weight = 0.6 + 0.8 * Math.exp(-Math.pow((t - 0.5) * 3, 2));
    const qty = Math.min(remaining, Math.round(perRun * weight));
    schedule.push({
      hour: +(i * (hours / runs)).toFixed(2),
      qty,
      label: `Run ${i + 1}`,
    });
    remaining -= qty;
  }
  return schedule;
}

// Safety / health score (0-100) for given ratios
export function calcSafetyScore(
  platform: Platform,
  views: number,
  likes: number,
  comments: number,
  followers: number
) {
  const b = ENGAGEMENT_BENCHMARKS[platform];
  const likeRatePct = (likes / Math.max(1, views)) * 100;
  const commentRatePct = (comments / Math.max(1, views)) * 100;
  const followRatePct = (followers / Math.max(1, views)) * 100;

  const inRange = (v: number, r: [number, number]) =>
    v >= r[0] * 0.5 && v <= r[1] * 1.5;

  let score = 0;
  let issues: string[] = [];

  if (inRange(likeRatePct, b.likeRate)) score += 35;
  else if (likeRatePct > b.likeRate[1] * 1.5) issues.push('Likes ratio bahut zyada — suspicious lag sakta hai');
  else if (likeRatePct < b.likeRate[0] * 0.5) issues.push('Likes ratio kam hai — aur likes add karein');

  if (inRange(commentRatePct, b.commentRate)) score += 30;
  else if (commentRatePct > b.commentRate[1] * 1.5) issues.push('Comments ratio over-spike — slow down');
  else issues.push('Comments kam hain — organic dikhne ke liye comments add karein');

  if (inRange(followRatePct, b.followRate)) score += 25;
  else if (followRatePct > b.followRate[1] * 1.5) issues.push('Follower spike detect — drip use karein');

  score += 10; // base
  return { score: Math.min(100, score), issues };
}

// ROI calculator
export function calcROI(spend: number, expectedConversions: number, valuePerConversion: number) {
  const revenue = expectedConversions * valuePerConversion;
  const profit = revenue - spend;
  const roi = spend > 0 ? (profit / spend) * 100 : 0;
  return { revenue, profit, roi };
}

// Hashtag tier recommendation
export function recommendHashtags(followerCount: number) {
  if (followerCount < 1000) return { mega: 0, macro: 2, mid: 5, micro: 15, niche: 8 };
  if (followerCount < 10000) return { mega: 1, macro: 4, mid: 8, micro: 10, niche: 7 };
  if (followerCount < 100000) return { mega: 3, macro: 7, mid: 10, micro: 7, niche: 3 };
  return { mega: 5, macro: 10, mid: 10, micro: 4, niche: 1 };
}
