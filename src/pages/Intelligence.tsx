import { useMemo, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { PageMeta } from '@/components/seo/PageMeta';
import {
  Brain, Calculator, TrendingUp, Trophy, ShieldCheck, Clock,
  Hash, Sparkles, Zap, BarChart3, Activity, Menu
} from 'lucide-react';
import {
  ENGAGEMENT_BENCHMARKS, BEST_TIMES, Platform,
  suggestEngagement, predictWinChance, votesNeededForWinChance,
  buildDripSchedule, calcSafetyScore, calcROI, recommendHashtags,
} from '@/lib/engagementIntelligence';

const PLATFORMS: { id: Platform; label: string }[] = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'twitter', label: 'Twitter / X' },
  { id: 'voting', label: 'Voting' },
];

function Section({ index, icon: Icon, title, children }: any) {
  return (
    <div className="border-t border-border py-12 first:border-t-0 first:pt-0">
      <div className="flex items-baseline justify-between mb-8">
        <div className="flex items-center gap-4">
          <span className="font-mono text-[10px] tracking-[0.25em] text-primary">:{String(index).padStart(2, '0')}</span>
          <h2 className="font-serif text-[28px] lg:text-[36px] leading-none text-foreground">{title}</h2>
        </div>
        <Icon className="w-4 h-4 text-muted-foreground hidden sm:block" />
      </div>
      {children}
    </div>
  );
}

function Input({ label, value, onChange, suffix }: any) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">:{label}</span>
      <div className="mt-2 flex items-baseline gap-2 border-b border-border pb-2 focus-within:border-primary transition-colors">
        <input type="number" value={value} onChange={(e) => onChange(+e.target.value)}
          className="flex-1 bg-transparent outline-none font-serif text-[24px] text-foreground" />
        {suffix && <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{suffix}</span>}
      </div>
    </label>
  );
}

function Stat({ label, value, sub }: any) {
  return (
    <div className="border border-border p-5 bg-card">
      <p className="font-mono text-[9px] tracking-[0.25em] uppercase text-muted-foreground mb-3">:{label}</p>
      <p className="font-serif text-[32px] leading-none text-foreground">{value}</p>
      {sub && <p className="mt-2 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default function Intelligence() {
  const [platform, setPlatform] = useState<Platform>('instagram');
  const [quality, setQuality] = useState<'safe' | 'balanced' | 'aggressive'>('balanced');
  const [views, setViews] = useState(10000);
  const [open, setOpen] = useState(false);

  const [yourVotes, setYourVotes] = useState(500);
  const [totalVotes, setTotalVotes] = useState(2000);
  const [competitors, setCompetitors] = useState(5);
  const [targetWin, setTargetWin] = useState(75);

  const [chkViews, setChkViews] = useState(10000);
  const [chkLikes, setChkLikes] = useState(450);
  const [chkComments, setChkComments] = useState(30);
  const [chkFollowers, setChkFollowers] = useState(80);

  const [spend, setSpend] = useState(500);
  const [conversions, setConversions] = useState(20);
  const [valuePer, setValuePer] = useState(250);

  const [dripQty, setDripQty] = useState(5000);
  const [dripHours, setDripHours] = useState(6);

  const [followers, setFollowers] = useState(5000);

  const suggest = useMemo(() => suggestEngagement(platform, views, quality), [platform, views, quality]);
  const winChance = useMemo(() => predictWinChance(yourVotes, totalVotes, competitors), [yourVotes, totalVotes, competitors]);
  const votesNeeded = useMemo(() => votesNeededForWinChance(targetWin, totalVotes, competitors, yourVotes), [targetWin, totalVotes, competitors, yourVotes]);
  const safety = useMemo(() => calcSafetyScore(platform, chkViews, chkLikes, chkComments, chkFollowers), [platform, chkViews, chkLikes, chkComments, chkFollowers]);
  const roi = useMemo(() => calcROI(spend, conversions, valuePer), [spend, conversions, valuePer]);
  const drip = useMemo(() => buildDripSchedule(dripQty, dripHours), [dripQty, dripHours]);
  const tags = useMemo(() => recommendHashtags(followers), [followers]);

  const b = ENGAGEMENT_BENCHMARKS[platform];

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <PageMeta title="Intelligence — Voting Pro" description="Engagement intelligence suite." />

      <div className="hidden lg:block w-64 shrink-0 fixed left-0 top-0 h-screen z-30">
        <Sidebar />
      </div>
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-72"><Sidebar onClose={() => setOpen(false)} /></div>
          <div className="flex-1 bg-black/70" onClick={() => setOpen(false)} />
        </div>
      )}

      <div className="flex-1 lg:ml-64 pb-24 lg:pb-12">
        <div className="lg:hidden flex items-center justify-between px-6 py-4 border-b border-border bg-background">
          <button onClick={() => setOpen(true)} className="p-2 text-muted-foreground"><Menu className="w-5 h-5" /></button>
          <span className="font-mono text-[11px] tracking-[0.2em] uppercase">:intelligence</span>
          <div className="w-9" />
        </div>

        <div className="max-w-5xl mx-auto px-6 lg:px-12 py-12 lg:py-20">

          {/* Hero */}
          <header className="mb-20">
            <p className="lux-eyebrow mb-6">:00 / intelligence suite</p>
            <h1 className="font-serif text-[clamp(2.5rem,8vw,6rem)] leading-[0.95] tracking-[-0.03em]">
              The quiet<br /><span className="italic text-primary">advantage.</span>
            </h1>
            <p className="mt-8 max-w-lg text-[15px] leading-[1.7] text-muted-foreground font-light">
              Nine instruments. One panel. Calibrated against the public benchmarks of Hootsuite,
              HypeAuditor, and Later — refined into actionable signal.
            </p>
          </header>

          {/* Platform + Quality */}
          <div className="mb-16 pb-8 border-b border-border">
            <p className="lux-eyebrow mb-4">:platform</p>
            <div className="flex flex-wrap gap-x-8 gap-y-3 mb-8">
              {PLATFORMS.map(p => (
                <button key={p.id} onClick={() => setPlatform(p.id)}
                  className={`font-mono text-[12px] tracking-[0.15em] uppercase transition-colors ${
                    platform === p.id ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}>
                  {platform === p.id && '· '}{p.label}
                </button>
              ))}
            </div>
            <p className="lux-eyebrow mb-4">:mode</p>
            <div className="flex gap-8">
              {(['safe', 'balanced', 'aggressive'] as const).map(q => (
                <button key={q} onClick={() => setQuality(q)}
                  className={`font-mono text-[12px] tracking-[0.15em] uppercase transition-colors ${
                    quality === q ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}>
                  {quality === q && '· '}{q}
                </button>
              ))}
            </div>
          </div>

          {/* 01 Ratio Calculator */}
          <Section index={1} icon={Calculator} title="Ratio calculator">
            <div className="grid sm:grid-cols-2 gap-8 mb-10 max-w-2xl">
              <Input label="target views" value={views} onChange={setViews} suffix="views" />
              <div>
                <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">:watch time</p>
                <p className="mt-2 font-serif text-[24px] text-primary">{suggest.watchTimePercent}%</p>
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-px bg-border border border-border">
              <Stat label="likes" value={suggest.likes.toLocaleString()} sub={`${b.likeRate[0]}–${b.likeRate[1]}%`} />
              <Stat label="comments" value={suggest.comments.toLocaleString()} sub={`${b.commentRate[0]}–${b.commentRate[1]}%`} />
              <Stat label="shares" value={suggest.shares.toLocaleString()} sub={`${b.shareRate[0]}–${b.shareRate[1]}%`} />
              <Stat label="saves" value={suggest.saves.toLocaleString()} sub={`${b.saveRate[0]}–${b.saveRate[1]}%`} />
              <Stat label="follows" value={suggest.followers.toLocaleString()} sub={`${b.followRate[0]}–${b.followRate[1]}%`} />
            </div>
          </Section>

          {/* 02 Voting */}
          <Section index={2} icon={Trophy} title="Voting predictor">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
              <Input label="your votes" value={yourVotes} onChange={setYourVotes} />
              <Input label="total contest" value={totalVotes} onChange={setTotalVotes} />
              <Input label="competitors" value={competitors} onChange={setCompetitors} />
              <Input label="target win" value={targetWin} onChange={setTargetWin} suffix="%" />
            </div>
            <div className="grid sm:grid-cols-3 gap-px bg-border border border-border">
              <div className="bg-card p-8">
                <p className="font-mono text-[9px] tracking-[0.25em] uppercase text-primary mb-3">:win chance</p>
                <p className="font-serif text-[64px] leading-none text-primary">{winChance}<span className="text-[28px]">%</span></p>
                <p className="mt-3 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">organic factored</p>
              </div>
              <Stat label="votes needed" value={votesNeeded.toLocaleString()} sub={`for ${targetWin}% target`} />
              <Stat label="current lead" value={`${Math.round((yourVotes / Math.max(1, totalVotes)) * 100)}%`} sub="of pool" />
            </div>
          </Section>

          {/* 03 Safety */}
          <Section index={3} icon={ShieldCheck} title="Safety audit">
            <div className="grid sm:grid-cols-4 gap-8 mb-10">
              <Input label="views" value={chkViews} onChange={setChkViews} />
              <Input label="likes" value={chkLikes} onChange={setChkLikes} />
              <Input label="comments" value={chkComments} onChange={setChkComments} />
              <Input label="new follows" value={chkFollowers} onChange={setChkFollowers} />
            </div>
            <div className="border border-border p-8 bg-card">
              <div className="flex items-baseline justify-between mb-5">
                <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-muted-foreground">:score</span>
                <span className="font-serif text-[56px] leading-none text-primary">{safety.score}<span className="text-[20px] text-muted-foreground">/100</span></span>
              </div>
              <div className="h-px w-full bg-border mb-5 relative overflow-hidden">
                <div className="absolute inset-y-0 left-0 bg-primary transition-all" style={{ width: safety.score + '%' }} />
              </div>
              {safety.issues.length > 0 ? (
                <ul className="space-y-3">
                  {safety.issues.map((i, idx) => (
                    <li key={idx} className="flex gap-3 text-[13px] text-muted-foreground font-light leading-relaxed">
                      <span className="text-warning shrink-0">—</span>{i}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-primary font-light">✓ Ratios within algorithmically safe ranges.</p>
              )}
            </div>
          </Section>

          {/* 04 Drip */}
          <Section index={4} icon={Activity} title="Drip schedule">
            <div className="grid sm:grid-cols-2 gap-8 mb-10 max-w-2xl">
              <Input label="quantity" value={dripQty} onChange={setDripQty} />
              <Input label="window" value={dripHours} onChange={setDripHours} suffix="hours" />
            </div>
            <div className="border border-border p-8 bg-card">
              <div className="flex items-end gap-1 h-32">
                {drip.map((r, i) => (
                  <div key={i} className="flex-1 bg-primary/60 hover:bg-primary transition-colors" title={`${r.qty} @ +${r.hour}h`}
                    style={{ height: `${(r.qty / Math.max(...drip.map(x => x.qty))) * 100}%`, minHeight: '3px' }} />
                ))}
              </div>
              <div className="flex justify-between mt-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <span>:00h</span><span>:{dripHours / 2}h</span><span>:{dripHours}h</span>
              </div>
            </div>
          </Section>

          {/* 05 ROI */}
          <Section index={5} icon={TrendingUp} title="Return calculator">
            <div className="grid sm:grid-cols-3 gap-8 mb-10">
              <Input label="spend" value={spend} onChange={setSpend} suffix="₹" />
              <Input label="conversions" value={conversions} onChange={setConversions} />
              <Input label="value each" value={valuePer} onChange={setValuePer} suffix="₹" />
            </div>
            <div className="grid grid-cols-3 gap-px bg-border border border-border">
              <Stat label="revenue" value={'₹' + roi.revenue.toLocaleString()} />
              <Stat label="profit" value={'₹' + roi.profit.toLocaleString()} />
              <Stat label="roi" value={roi.roi.toFixed(1) + '%'} />
            </div>
          </Section>

          {/* 06 Times */}
          <Section index={6} icon={Clock} title="Peak windows">
            <ul className="divide-y divide-border border-y border-border">
              {BEST_TIMES[platform].map((t, i) => (
                <li key={i} className="flex items-center gap-8 py-5">
                  <span className="font-mono text-[10px] tracking-[0.25em] text-primary w-8">:0{i + 1}</span>
                  <span className="font-serif text-[22px] text-foreground">{t}</span>
                </li>
              ))}
            </ul>
          </Section>

          {/* 07 Hashtags */}
          <Section index={7} icon={Hash} title="Hashtag composition">
            <div className="max-w-md mb-10">
              <Input label="your followers" value={followers} onChange={setFollowers} />
            </div>
            <div className="grid grid-cols-5 gap-px bg-border border border-border">
              <Stat label="mega" value={tags.mega} sub="1m+" />
              <Stat label="macro" value={tags.macro} sub="100k+" />
              <Stat label="mid" value={tags.mid} sub="10k+" />
              <Stat label="micro" value={tags.micro} sub="<10k" />
              <Stat label="niche" value={tags.niche} sub="topic" />
            </div>
          </Section>

          {/* 08 Benchmarks */}
          <Section index={8} icon={BarChart3} title="Benchmarks table">
            <div className="border border-border bg-card">
              {[
                ['Like rate', b.likeRate],
                ['Comment rate', b.commentRate],
                ['Share rate', b.shareRate],
                ['Save rate', b.saveRate],
                ['Follow rate', b.followRate],
                ['Watch time', b.watchTime],
              ].map(([label, r]: any, i, arr) => (
                <div key={label} className={`flex items-baseline justify-between px-6 py-4 ${i < arr.length - 1 ? 'border-b border-border' : ''}`}>
                  <span className="font-mono text-[11px] tracking-[0.15em] uppercase text-muted-foreground">:{label.toLowerCase().replace(' ', '_')}</span>
                  <span className="font-serif text-[20px] text-primary">{r[0]}% — {r[1]}%</span>
                </div>
              ))}
            </div>
          </Section>

          {/* 09 Principles */}
          <Section index={9} icon={Sparkles} title="Operating principles">
            <ul className="space-y-6 max-w-2xl">
              {[
                ['Sequence', 'Views first, engagement six to twelve hours later.'],
                ['Restraint', 'Never deliver more than 30% in the first hour.'],
                ['Quality', 'Twenty relevant comments outweigh two hundred generic.'],
                ['Voting', 'Reserve 60% of votes for the final 48 hours — judges watch activity.'],
                ['Saves', 'On Instagram, the save-to-like ratio is the strongest signal.'],
                ['Retention', 'YouTube and TikTok demand watch time above all — 50% minimum.'],
              ].map(([t, d]) => (
                <li key={t} className="flex gap-6">
                  <Zap className="w-4 h-4 mt-1 text-primary shrink-0" />
                  <div>
                    <p className="font-serif text-[20px] text-foreground mb-1">{t}</p>
                    <p className="text-[13px] text-muted-foreground font-light leading-relaxed">{d}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Section>

        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
