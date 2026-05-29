import { useMemo, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { PageMeta } from '@/components/seo/PageMeta';
import {
  Brain, Calculator, TrendingUp, Trophy, ShieldCheck, Clock,
  Hash, Target, Sparkles, Zap, BarChart3, Activity, Menu
} from 'lucide-react';
import {
  ENGAGEMENT_BENCHMARKS, BEST_TIMES, Platform,
  suggestEngagement, predictWinChance, votesNeededForWinChance,
  buildDripSchedule, calcSafetyScore, calcROI, recommendHashtags,
} from '@/lib/engagementIntelligence';

const PLATFORMS: { id: Platform; label: string; emoji: string }[] = [
  { id: 'instagram', label: 'Instagram', emoji: '📸' },
  { id: 'youtube', label: 'YouTube', emoji: '▶️' },
  { id: 'tiktok', label: 'TikTok', emoji: '🎵' },
  { id: 'facebook', label: 'Facebook', emoji: '👥' },
  { id: 'twitter', label: 'Twitter/X', emoji: '🐦' },
  { id: 'voting', label: 'Voting Contest', emoji: '🗳️' },
];

function Card({ icon: Icon, title, badge, children, accent = '#16a34a' }: any) {
  return (
    <div className="rounded-2xl p-5 bg-white" style={{ border: '1px solid #f0e8ef', boxShadow: '0 2px 14px rgba(0,0,0,.03)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: accent + '15' }}>
            <Icon className="w-4 h-4" style={{ color: accent }} />
          </div>
          <h3 className="font-bold text-[15px]" style={{ color: '#1a1a2e' }}>{title}</h3>
        </div>
        {badge && <span className="text-[9px] font-bold px-2 py-1 rounded-full" style={{ background: accent + '15', color: accent }}>{badge}</span>}
      </div>
      {children}
    </div>
  );
}

function Input({ label, value, onChange, type = 'number', suffix }: any) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#888' }}>{label}</span>
      <div className="mt-1 flex items-center gap-2 px-3 h-10 rounded-xl" style={{ background: '#fafafa', border: '1px solid #f0e8ef' }}>
        <input type={type} value={value} onChange={(e) => onChange(type === 'number' ? +e.target.value : e.target.value)}
          className="flex-1 bg-transparent outline-none text-[14px] font-semibold" style={{ color: '#1a1a2e' }} />
        {suffix && <span className="text-[11px] font-medium" style={{ color: '#aaa' }}>{suffix}</span>}
      </div>
    </label>
  );
}

function Stat({ label, value, sub, color = '#16a34a' }: any) {
  return (
    <div className="rounded-xl p-3" style={{ background: color + '0d', border: '1px solid ' + color + '22' }}>
      <div className="text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color }}>{label}</div>
      <div className="text-[20px] font-extrabold tracking-tight" style={{ color: '#1a1a2e' }}>{value}</div>
      {sub && <div className="text-[10px] mt-0.5" style={{ color: '#aaa' }}>{sub}</div>}
    </div>
  );
}

export default function Intelligence() {
  const [platform, setPlatform] = useState<Platform>('instagram');
  const [quality, setQuality] = useState<'safe' | 'balanced' | 'aggressive'>('balanced');
  const [views, setViews] = useState(10000);
  const [open, setOpen] = useState(false);

  // Voting predictor state
  const [yourVotes, setYourVotes] = useState(500);
  const [totalVotes, setTotalVotes] = useState(2000);
  const [competitors, setCompetitors] = useState(5);
  const [targetWin, setTargetWin] = useState(75);

  // Safety check
  const [chkViews, setChkViews] = useState(10000);
  const [chkLikes, setChkLikes] = useState(450);
  const [chkComments, setChkComments] = useState(30);
  const [chkFollowers, setChkFollowers] = useState(80);

  // ROI
  const [spend, setSpend] = useState(500);
  const [conversions, setConversions] = useState(20);
  const [valuePer, setValuePer] = useState(250);

  // Drip
  const [dripQty, setDripQty] = useState(5000);
  const [dripHours, setDripHours] = useState(6);

  // Hashtags
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
    <div className="min-h-screen flex" style={{ background: '#fafafa' }}>
      <PageMeta title="Engagement Intelligence — Voting Pro" description="Smart suggestions for views, likes, comments, voting % and growth." />

      <div className="hidden lg:block w-64 shrink-0 fixed left-0 top-0 h-screen z-30">
        <Sidebar />
      </div>
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-72 bg-white"><Sidebar onClose={() => setOpen(false)} /></div>
          <div className="flex-1 bg-black/40" onClick={() => setOpen(false)} />
        </div>
      )}

      <div className="flex-1 lg:ml-64 pb-24 lg:pb-6">
        <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white" style={{ borderBottom: '1px solid #f0e8ef' }}>
          <button onClick={() => setOpen(true)} className="p-2"><Menu className="w-5 h-5" /></button>
          <span className="font-bold">Intelligence</span>
          <div className="w-9" />
        </div>

        <div className="max-w-6xl mx-auto p-5 lg:p-8 space-y-6">
          {/* Hero */}
          <div className="rounded-3xl p-6 lg:p-8 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #16a34a 0%, #15803d 50%, #064e3b 100%)' }}>
            <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full" style={{ background: 'rgba(255,255,255,.08)' }} />
            <div className="absolute -right-20 -bottom-20 w-60 h-60 rounded-full" style={{ background: 'rgba(255,255,255,.05)' }} />
            <div className="relative">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-3" style={{ background: 'rgba(255,255,255,.18)' }}>
                <Brain className="w-3 h-3" /><span className="text-[10px] font-bold uppercase tracking-wider">AI Intelligence Suite</span>
              </div>
              <h1 className="text-2xl lg:text-4xl font-extrabold tracking-tight mb-2">Smart Engagement Suggestions</h1>
              <p className="text-[13px] lg:text-[15px] opacity-90 max-w-2xl">Research-backed ratios, win-probability predictor, safety score, organic drip planner, ROI calculator — sab kuch ek jagah.</p>
            </div>
          </div>

          {/* Platform + Quality picker */}
          <div className="rounded-2xl bg-white p-4" style={{ border: '1px solid #f0e8ef' }}>
            <div className="flex flex-wrap gap-2 mb-3">
              {PLATFORMS.map(p => (
                <button key={p.id} onClick={() => setPlatform(p.id)}
                  className="px-3 py-2 rounded-xl text-[12px] font-semibold flex items-center gap-1.5 transition-all"
                  style={{
                    background: platform === p.id ? '#16a34a' : '#f5f5f5',
                    color: platform === p.id ? 'white' : '#666',
                  }}>
                  <span>{p.emoji}</span>{p.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              {(['safe', 'balanced', 'aggressive'] as const).map(q => (
                <button key={q} onClick={() => setQuality(q)}
                  className="flex-1 px-3 py-2 rounded-xl text-[11px] font-semibold uppercase tracking-wider transition-all"
                  style={{
                    background: quality === q ? '#1a1a2e' : '#fafafa',
                    color: quality === q ? 'white' : '#888',
                    border: '1px solid #f0e8ef',
                  }}>{q}</button>
              ))}
            </div>
          </div>

          {/* Smart Ratio Calculator */}
          <Card icon={Calculator} title="Smart Ratio Calculator" badge="Auto" accent="#16a34a">
            <div className="grid sm:grid-cols-2 gap-3 mb-4">
              <Input label="Target Views" value={views} onChange={setViews} suffix="views" />
              <div className="rounded-xl p-3 flex flex-col justify-center" style={{ background: '#f0fdf4', border: '1px solid #dcfce7' }}>
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#16a34a' }}>Watch Time Target</span>
                <span className="text-[18px] font-extrabold" style={{ color: '#1a1a2e' }}>{suggest.watchTimePercent}%</span>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <Stat label="Likes" value={suggest.likes.toLocaleString()} sub={`${b.likeRate[0]}–${b.likeRate[1]}%`} />
              <Stat label="Comments" value={suggest.comments.toLocaleString()} sub={`${b.commentRate[0]}–${b.commentRate[1]}%`} color="#f97316" />
              <Stat label="Shares" value={suggest.shares.toLocaleString()} sub={`${b.shareRate[0]}–${b.shareRate[1]}%`} color="#0ea5e9" />
              <Stat label="Saves" value={suggest.saves.toLocaleString()} sub={`${b.saveRate[0]}–${b.saveRate[1]}%`} color="#a855f7" />
              <Stat label="Followers" value={suggest.followers.toLocaleString()} sub={`${b.followRate[0]}–${b.followRate[1]}%`} color="#ec4899" />
            </div>
            <p className="text-[11px] mt-3 leading-relaxed" style={{ color: '#888' }}>
              💡 Ye ratios <strong>{platform}</strong> ke healthy organic benchmarks par based hain ({quality} mode). Inse stick karne se algorithm ko engagement natural lagta hai.
            </p>
          </Card>

          {/* Voting Win Predictor */}
          <Card icon={Trophy} title="Voting Win Probability Predictor" badge="Live" accent="#f97316">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <Input label="Your Votes" value={yourVotes} onChange={setYourVotes} />
              <Input label="Total Contest Votes" value={totalVotes} onChange={setTotalVotes} />
              <Input label="Competitors" value={competitors} onChange={setCompetitors} />
              <Input label="Target Win %" value={targetWin} onChange={setTargetWin} suffix="%" />
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="rounded-xl p-4 text-white" style={{ background: `linear-gradient(135deg, #f97316, #ea580c)` }}>
                <div className="text-[10px] uppercase font-bold tracking-wider opacity-90">Current Win Chance</div>
                <div className="text-[36px] font-extrabold leading-none mt-2">{winChance}%</div>
                <div className="text-[11px] opacity-80 mt-1">organic snowball factored</div>
              </div>
              <Stat label="Votes Needed" value={votesNeeded.toLocaleString()} sub={`for ${targetWin}% win chance`} color="#16a34a" />
              <Stat label="Your Lead" value={`${Math.round((yourVotes / Math.max(1, totalVotes)) * 100)}%`} sub="of total pool" color="#0ea5e9" />
            </div>
          </Card>

          {/* Safety / Health Score */}
          <Card icon={ShieldCheck} title="Account Safety & Ratio Health" badge={safety.score + '/100'} accent={safety.score > 70 ? '#16a34a' : safety.score > 40 ? '#f97316' : '#dc2626'}>
            <div className="grid sm:grid-cols-4 gap-3 mb-4">
              <Input label="Current Views" value={chkViews} onChange={setChkViews} />
              <Input label="Current Likes" value={chkLikes} onChange={setChkLikes} />
              <Input label="Comments" value={chkComments} onChange={setChkComments} />
              <Input label="New Followers" value={chkFollowers} onChange={setChkFollowers} />
            </div>
            <div className="rounded-xl p-4" style={{ background: '#fafafa', border: '1px solid #f0e8ef' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12px] font-semibold" style={{ color: '#666' }}>Safety Score</span>
                <span className="text-[24px] font-extrabold" style={{ color: safety.score > 70 ? '#16a34a' : safety.score > 40 ? '#f97316' : '#dc2626' }}>{safety.score}/100</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: '#f0e8ef' }}>
                <div className="h-full transition-all" style={{ width: safety.score + '%', background: safety.score > 70 ? '#16a34a' : safety.score > 40 ? '#f97316' : '#dc2626' }} />
              </div>
              {safety.issues.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {safety.issues.map((i, idx) => (
                    <li key={idx} className="text-[12px] flex gap-2" style={{ color: '#666' }}>
                      <span style={{ color: '#f97316' }}>⚠</span>{i}
                    </li>
                  ))}
                </ul>
              )}
              {safety.issues.length === 0 && (
                <p className="text-[12px] mt-3 font-medium" style={{ color: '#16a34a' }}>✓ Ratios healthy hain — algorithm-safe range mein ho.</p>
              )}
            </div>
          </Card>

          {/* Drip Schedule Planner */}
          <Card icon={Activity} title="Organic Drip Schedule" badge="Bell-curve" accent="#0ea5e9">
            <div className="grid sm:grid-cols-2 gap-3 mb-4">
              <Input label="Total Quantity" value={dripQty} onChange={setDripQty} />
              <Input label="Spread Over" value={dripHours} onChange={setDripHours} suffix="hours" />
            </div>
            <div className="rounded-xl p-3" style={{ background: '#f0f9ff', border: '1px solid #e0f2fe' }}>
              <div className="flex items-end gap-1 h-24">
                {drip.map((r, i) => (
                  <div key={i} className="flex-1 rounded-t" title={`${r.qty} @ +${r.hour}h`}
                    style={{ height: `${(r.qty / Math.max(...drip.map(x => x.qty))) * 100}%`, background: 'linear-gradient(180deg, #0ea5e9, #0284c7)', minHeight: '4px' }} />
                ))}
              </div>
              <div className="flex justify-between mt-2 text-[10px]" style={{ color: '#888' }}>
                <span>0h</span><span>{dripHours / 2}h</span><span>{dripHours}h</span>
              </div>
            </div>
            <p className="text-[11px] mt-3" style={{ color: '#888' }}>
              💡 Bell-curve distribution real human activity mimic karta hai — algorithm flag nahi karta.
            </p>
          </Card>

          {/* ROI Calculator */}
          <Card icon={TrendingUp} title="ROI / Conversion Calculator" accent="#a855f7">
            <div className="grid sm:grid-cols-3 gap-3 mb-4">
              <Input label="Total Spend (₹)" value={spend} onChange={setSpend} suffix="₹" />
              <Input label="Expected Conversions" value={conversions} onChange={setConversions} />
              <Input label="Value per Conversion" value={valuePer} onChange={setValuePer} suffix="₹" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Revenue" value={'₹' + roi.revenue.toLocaleString()} color="#16a34a" />
              <Stat label="Profit" value={'₹' + roi.profit.toLocaleString()} color={roi.profit >= 0 ? '#16a34a' : '#dc2626'} />
              <Stat label="ROI" value={roi.roi.toFixed(1) + '%'} color="#a855f7" />
            </div>
          </Card>

          {/* Best Times */}
          <Card icon={Clock} title="Best Posting Times" badge={platform.toUpperCase()} accent="#ec4899">
            <ul className="space-y-2">
              {BEST_TIMES[platform].map((t, i) => (
                <li key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#fafafa', border: '1px solid #f0e8ef' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[12px] font-bold text-white" style={{ background: '#ec4899' }}>{i + 1}</div>
                  <span className="text-[13px] font-semibold" style={{ color: '#1a1a2e' }}>{t}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Hashtag Strategy */}
          <Card icon={Hash} title="Hashtag Tier Strategy" accent="#0ea5e9">
            <div className="mb-4"><Input label="Your Follower Count" value={followers} onChange={setFollowers} /></div>
            <div className="grid grid-cols-5 gap-2">
              <Stat label="Mega (1M+)" value={tags.mega} color="#dc2626" />
              <Stat label="Macro (100k+)" value={tags.macro} color="#f97316" />
              <Stat label="Mid (10k+)" value={tags.mid} color="#eab308" />
              <Stat label="Micro (<10k)" value={tags.micro} color="#16a34a" />
              <Stat label="Niche" value={tags.niche} color="#0ea5e9" />
            </div>
            <p className="text-[11px] mt-3" style={{ color: '#888' }}>
              💡 Total 30 hashtags ka split — chote accounts ke liye micro+niche zyada effective hote hain.
            </p>
          </Card>

          {/* Platform Benchmarks Reference */}
          <Card icon={BarChart3} title="Industry Benchmarks Reference" accent="#1a1a2e">
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr style={{ borderBottom: '1px solid #f0e8ef' }}>
                    <th className="text-left py-2 font-semibold" style={{ color: '#888' }}>Metric</th>
                    <th className="text-right py-2 font-semibold" style={{ color: '#888' }}>Healthy Range (per 100 views)</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Like rate', b.likeRate],
                    ['Comment rate', b.commentRate],
                    ['Share rate', b.shareRate],
                    ['Save rate', b.saveRate],
                    ['Follow rate', b.followRate],
                    ['Watch time %', b.watchTime],
                  ].map(([label, r]: any) => (
                    <tr key={label} style={{ borderBottom: '1px solid #fafafa' }}>
                      <td className="py-2.5 font-medium" style={{ color: '#1a1a2e' }}>{label}</td>
                      <td className="py-2.5 text-right font-bold" style={{ color: '#16a34a' }}>{r[0]}% – {r[1]}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Pro Tips */}
          <Card icon={Sparkles} title="Pro Tips — Algorithm Safety" accent="#16a34a">
            <ul className="space-y-2 text-[12px]" style={{ color: '#555' }}>
              <li className="flex gap-2"><Zap className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: '#16a34a' }} /><span><strong>Views first, engagement later:</strong> Pehle views build karein, fir 6–12 ghante baad likes/comments add karein.</span></li>
              <li className="flex gap-2"><Zap className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: '#16a34a' }} /><span><strong>Never max-spike:</strong> Total target ka 30% hi pehle ghante mein deliver karein.</span></li>
              <li className="flex gap-2"><Zap className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: '#16a34a' }} /><span><strong>Comment quality &gt; quantity:</strong> 20 relevant comments &gt; 200 generic.</span></li>
              <li className="flex gap-2"><Zap className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: '#16a34a' }} /><span><strong>Voting contests:</strong> Final 48 ghante mein 60% votes deliver karein — judges activity dekhte hain.</span></li>
              <li className="flex gap-2"><Zap className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: '#16a34a' }} /><span><strong>Saves matter most</strong> on Instagram — algorithm save:like ratio dekhta hai.</span></li>
              <li className="flex gap-2"><Zap className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: '#16a34a' }} /><span><strong>Watch-time</strong> YouTube/TikTok ke liye sabse zaroori — 50%+ retention chahiye.</span></li>
            </ul>
          </Card>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
