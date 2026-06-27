import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CheckCircle2, Instagram, Youtube, Music2, Facebook, Twitter, Zap, Crown } from 'lucide-react';
import { PageMeta } from '@/components/seo/PageMeta';
import logo from '@/assets/logo.png';

const INK = '#0F1B3D';
const ACCENT = '#4F7CFF';
const SOFT = '#E8EEFF';

const Index = () => {
  return (
    <div
      className="min-h-screen w-full font-sans antialiased overflow-x-hidden"
      style={{
        color: INK,
        background:
          'linear-gradient(180deg, #EAF0FF 0%, #DCE6FF 35%, #E8EEFF 70%, #F1F4FF 100%)',
      }}
    >
      <PageMeta
        title="Boostly Pro — Premium Social Growth Engine"
        description="Boostly Pro delivers organic, undetectable engagement for serious creators. Multi-platform growth with AI-organic delivery and zero compromise."
        canonicalPath="/"
        breadcrumbs={[{ name: 'Home', path: '/' }]}
      />

      {/* NAV */}
      <nav className="fixed top-0 inset-x-0 z-50 px-6 lg:px-14 py-5 flex items-center justify-between bg-transparent backdrop-blur-sm">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={logo} alt="Boostly Pro" className="w-10 h-10 rounded-full object-cover ring-1" style={{ boxShadow: `0 0 0 1px ${INK}20` }} />
          <div className="leading-tight">
            <div className="font-serif text-[20px] tracking-tight" style={{ color: INK }}>Boostly <span className="italic">Pro</span></div>
            <div className="font-mono text-[9px] tracking-[0.22em] uppercase" style={{ color: `${INK}80` }}>by daniel brooks</div>
          </div>
        </Link>
        <div className="hidden md:flex items-center gap-10 text-[14px]" style={{ color: `${INK}CC` }}>
          <a href="#features" className="hover:opacity-100 opacity-80 transition">Home</a>
          <a href="#features" className="hover:opacity-100 opacity-80 transition">Features</a>
          <a href="#platforms" className="hover:opacity-100 opacity-80 transition">Platforms</a>
          <a href="#pricing" className="hover:opacity-100 opacity-80 transition">Pricing</a>
          <Link to="/support" className="hover:opacity-100 opacity-80 transition">Support</Link>
        </div>
        <Link to="/auth" className="inline-flex items-center px-6 h-10 rounded-full text-[13px] font-medium transition-all" style={{ background: INK, color: 'white' }}>
          Log in
        </Link>
      </nav>

      {/* HERO */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center overflow-hidden">
        <div aria-hidden className="absolute inset-0" style={{ background: 'linear-gradient(145deg, #F3F7FF 0%, #DCE8FF 48%, #CFE0FF 100%)' }} />
        <div aria-hidden className="absolute inset-0 opacity-60" style={{ background: 'radial-gradient(ellipse 55% 45% at 25% 18%, #FFFFFF 0%, transparent 70%), radial-gradient(ellipse 70% 55% at 80% 80%, rgba(79,124,255,0.18) 0%, transparent 70%)' }} />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-36" style={{ background: 'linear-gradient(180deg, transparent 0%, #EAF0FF 100%)' }} />

        <div className="relative z-10 max-w-5xl mx-auto pt-24">
          <p className="font-mono text-[11px] tracking-[0.4em] uppercase mb-10" style={{ color: `${INK}99` }}>
            Boostly Pro — Private Circle
          </p>
          <h1 className="font-serif text-[clamp(3rem,9vw,7rem)] leading-[0.95] tracking-[-0.02em]" style={{ color: INK }}>
            Built Different.
          </h1>
          <h1 className="font-serif italic text-[clamp(3rem,9vw,7rem)] leading-[0.95] tracking-[-0.02em] mt-2" style={{ color: ACCENT }}>
            Paid Different.
          </h1>
          <p className="mt-10 text-[17px] font-light" style={{ color: `${INK}B3` }}>Quiet money. Loud results.</p>
          <Link
            to="/auth"
            className="mt-10 inline-flex items-center justify-center px-10 h-14 rounded-full text-[13px] font-semibold tracking-[0.25em] uppercase transition-all"
            style={{ background: INK, color: 'white' }}
          >
            Start Now
          </Link>
          <p className="mt-8 font-mono text-[10px] tracking-[0.35em] uppercase" style={{ color: `${INK}66` }}>
            Members Only · By Invitation
          </p>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="features" className="px-6 lg:px-14 py-28" style={{ borderTop: `1px solid ${INK}14` }}>
        <div className="max-w-[1400px] mx-auto">
          <div className="text-center mb-20">
            <p className="font-mono text-[10px] tracking-[0.3em] uppercase mb-6" style={{ color: `${INK}80` }}>— How it works</p>
            <h2 className="font-serif text-[clamp(2.5rem,6vw,5rem)] leading-[0.95] tracking-[-0.02em]" style={{ color: INK }}>
              The full panel <span className="italic" style={{ color: ACCENT }}>flow.</span>
            </h2>
            <p className="mt-6 max-w-2xl mx-auto text-[15px] leading-[1.7] font-light" style={{ color: `${INK}99` }}>
              From provider API to organic delivery — every step is transparent. See the diagram below to understand how your order runs behind the scenes.
            </p>
          </div>

          <div className="relative max-w-[1100px] mx-auto">
            {/* STEP 1 */}
            <div className="grid md:grid-cols-3 gap-4 mb-3">
              {['Provider A', 'Provider B', 'Provider C'].map((p, i) => (
                <div key={p} className="rounded-2xl p-5 text-center" style={{ background: 'white', border: `1px solid ${INK}1A`, boxShadow: `0 10px 30px -20px ${INK}33` }}>
                  <p className="font-mono text-[9px] tracking-[0.25em] uppercase mb-2" style={{ color: `${INK}80` }}>SMM Panel #{i + 1}</p>
                  <p className="font-serif text-[18px]" style={{ color: INK }}>{p}</p>
                  <p className="text-[11px] mt-1" style={{ color: `${INK}80` }}>API key + balance</p>
                </div>
              ))}
            </div>
            <p className="text-center font-mono text-[10px] tracking-[0.2em] uppercase mb-2" style={{ color: `${INK}80` }}>Step 1 · Connect provider API keys in admin panel</p>

            <div className="flex justify-center my-6"><div className="w-px h-12" style={{ background: `linear-gradient(to bottom, ${INK}66, transparent)` }} /></div>

            {/* STEP 2 */}
            <div className="rounded-2xl p-8 text-center mb-3" style={{ background: `linear-gradient(135deg, ${ACCENT}1A, ${SOFT})`, border: `1px solid ${ACCENT}33` }}>
              <p className="font-mono text-[9px] tracking-[0.25em] uppercase mb-3" style={{ color: ACCENT }}>Core Engine</p>
              <h3 className="font-serif text-[28px] mb-2" style={{ color: INK }}>LRU Rotation + Auto Failover</h3>
              <p className="text-[13px] max-w-lg mx-auto" style={{ color: `${INK}99` }}>The freshest provider is picked for every order. If one goes down, another takes over automatically.</p>
            </div>
            <p className="text-center font-mono text-[10px] tracking-[0.2em] uppercase mb-2" style={{ color: `${INK}80` }}>Step 2 · Smart routing, no single point of failure</p>

            <div className="flex justify-center my-6"><div className="w-px h-12" style={{ background: `linear-gradient(to bottom, ${INK}66, transparent)` }} /></div>

            {/* STEP 3 */}
            <div className="grid md:grid-cols-2 gap-4 mb-3">
              {[
                { tag: 'Service Mapping', h: 'Provider services → Your services', d: 'Admin har provider ki service ko apni catalog se map karta hai. Pricing, quality, speed sab control me.' },
                { tag: 'Bundle Builder', h: 'Likes + Views + Followers', d: 'Multiple services ko ek bundle me pack karo. User ek hi click me poora growth package le.' },
              ].map((c) => (
                <div key={c.tag} className="rounded-2xl p-6" style={{ background: 'white', border: `1px solid ${INK}1A`, boxShadow: `0 10px 30px -20px ${INK}33` }}>
                  <p className="font-mono text-[9px] tracking-[0.25em] uppercase mb-2" style={{ color: `${INK}80` }}>{c.tag}</p>
                  <h3 className="font-serif text-[22px] mb-2" style={{ color: INK }}>{c.h}</h3>
                  <p className="text-[12px] leading-relaxed" style={{ color: `${INK}99` }}>{c.d}</p>
                </div>
              ))}
            </div>
            <p className="text-center font-mono text-[10px] tracking-[0.2em] uppercase mb-2" style={{ color: `${INK}80` }}>Step 3 · Build catalog & bundles inside admin</p>

            <div className="flex justify-center my-6"><div className="w-px h-12" style={{ background: `linear-gradient(to bottom, ${INK}66, transparent)` }} /></div>

            {/* STEP 4 */}
            <div className="grid md:grid-cols-2 gap-4 mb-3">
              <div className="rounded-2xl p-6" style={{ background: 'white', border: `1px solid ${INK}1A`, boxShadow: `0 10px 30px -20px ${INK}33` }}>
                <p className="font-mono text-[9px] tracking-[0.25em] uppercase mb-2" style={{ color: `${INK}80` }}>Mode A · Instant</p>
                <h3 className="font-serif text-[22px] mb-2" style={{ color: INK }}>Engagement Orders</h3>
                <p className="text-[12px] leading-relaxed" style={{ color: `${INK}99` }}>User place karta hai → provider ko forward → fast delivery. Direct, sidha, quick.</p>
              </div>
              <div className="rounded-2xl p-6" style={{ background: `linear-gradient(135deg, ${ACCENT}1A, ${SOFT})`, border: `1px solid ${ACCENT}40` }}>
                <p className="font-mono text-[9px] tracking-[0.25em] uppercase mb-2" style={{ color: ACCENT }}>Mode B · Natural</p>
                <h3 className="font-serif text-[22px] mb-2" style={{ color: INK }}>Organic Delivery</h3>
                <p className="text-[12px] leading-relaxed" style={{ color: `${INK}99` }}>S-curve, ±50% variance, peak-hour weighting. Order chhote chunks me schedule hota hai — algorithm ko lagta hai real audience aa rahi hai.</p>
              </div>
            </div>
            <p className="text-center font-mono text-[10px] tracking-[0.2em] uppercase mb-2" style={{ color: `${INK}80` }}>Step 4 · User chooses delivery style</p>

            <div className="flex justify-center my-6"><div className="w-px h-12" style={{ background: `linear-gradient(to bottom, ${INK}66, transparent)` }} /></div>

            {/* STEP 5 */}
            <div className="rounded-2xl p-8 text-center" style={{ background: INK, color: 'white' }}>
              <p className="font-mono text-[9px] tracking-[0.25em] uppercase mb-3" style={{ color: '#9FB6FF' }}>Final</p>
              <h3 className="font-serif text-[28px] mb-2 text-white">Safe, quiet, undetectable growth</h3>
              <p className="text-[13px] max-w-lg mx-auto text-white/70">Wallet deduct → order tracked → live status → refill if drop. Full automation.</p>
            </div>
          </div>
        </div>
      </section>

      {/* PLATFORMS */}
      <section id="platforms" className="px-6 lg:px-14 py-28" style={{ borderTop: `1px solid ${INK}14` }}>
        <div className="max-w-[1400px] mx-auto">
          <div className="text-center mb-14">
            <p className="font-mono text-[10px] tracking-[0.3em] uppercase mb-6" style={{ color: `${INK}80` }}>— Coverage</p>
            <h2 className="font-serif text-[clamp(2.5rem,6vw,5rem)] leading-[0.95] tracking-[-0.02em]" style={{ color: INK }}>
              Every platform. <span className="italic" style={{ color: ACCENT }}>One engine.</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { icon: Instagram, name: 'Instagram', services: 'Likes · Views · Followers' },
              { icon: Youtube, name: 'YouTube', services: 'Views · Subs · Watch time' },
              { icon: Music2, name: 'TikTok', services: 'Views · Likes · Shares' },
              { icon: Facebook, name: 'Facebook', services: 'Likes · Followers · Reach' },
              { icon: Twitter, name: 'Twitter / X', services: 'Followers · Retweets · Likes' },
            ].map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.name} className="p-6 rounded-2xl transition-all" style={{ background: 'white', border: `1px solid ${INK}1A`, boxShadow: `0 10px 30px -20px ${INK}33` }}>
                  <Icon className="w-7 h-7 mb-4" style={{ color: ACCENT }} />
                  <h3 className="font-serif text-[18px] mb-1" style={{ color: INK }}>{p.name}</h3>
                  <p className="text-[11px] font-mono uppercase tracking-wider" style={{ color: `${INK}80` }}>{p.services}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="px-6 lg:px-14 py-28" style={{ borderTop: `1px solid ${INK}14` }}>
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-16">
            <p className="font-mono text-[10px] tracking-[0.3em] uppercase mb-6" style={{ color: `${INK}80` }}>— Membership</p>
            <h2 className="font-serif text-[clamp(2.5rem,6vw,5rem)] leading-[0.95] tracking-[-0.02em]" style={{ color: INK }}>
              Two ways to <span className="italic" style={{ color: ACCENT }}>begin.</span>
            </h2>
            <p className="mt-6 max-w-xl mx-auto text-[15px] leading-[1.7] font-light" style={{ color: `${INK}99` }}>
              Single membership — full platform access. No tiers, no upsells, no hidden gates.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5 max-w-3xl mx-auto">
            {/* Monthly */}
            <div className="rounded-2xl p-8 lg:p-10 transition-all" style={{ background: 'white', border: `1px solid ${INK}1A`, boxShadow: `0 20px 60px -30px ${INK}40` }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: SOFT, border: `1px solid ${ACCENT}33` }}>
                  <Zap className="w-4 h-4" style={{ color: ACCENT }} />
                </div>
                <p className="font-mono text-[10px] tracking-[0.25em] uppercase" style={{ color: `${INK}80` }}>Monthly</p>
              </div>
              <h3 className="font-serif text-2xl mb-3" style={{ color: INK }}>Monthly Access</h3>
              <div className="flex items-baseline gap-2 mb-8">
                <span className="font-serif text-5xl" style={{ color: INK }}>$35</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: `${INK}80` }}>/ month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {['Full platform access', 'All platforms & services', 'Organic delivery engine', 'Cancel anytime'].map((t) => (
                  <li key={t} className="flex gap-3 text-[13px] font-light" style={{ color: `${INK}CC` }}>
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: ACCENT }} />{t}
                  </li>
                ))}
              </ul>
              <Link to="/auth" className="flex items-center justify-center gap-2 w-full h-11 rounded-full font-mono text-[11px] uppercase tracking-[0.2em] transition-all" style={{ border: `1px solid ${INK}33`, color: INK }}>
                Start Monthly <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Lifetime */}
            <div className="relative rounded-2xl p-8 lg:p-10" style={{ background: INK, color: 'white', boxShadow: `0 40px 100px -30px ${INK}66` }}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full font-mono text-[9px] uppercase tracking-[0.25em]" style={{ background: ACCENT, color: 'white' }}>
                Best Value
              </div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>
                  <Crown className="w-4 h-4 text-white" />
                </div>
                <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-white/70">Lifetime</p>
              </div>
              <h3 className="font-serif text-2xl mb-3 text-white">Lifetime Access</h3>
              <div className="flex items-baseline gap-2 mb-8">
                <span className="font-serif text-5xl text-white">$100</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/60">/ once</span>
              </div>
              <ul className="space-y-3 mb-8">
                {['Everything in monthly', 'Pay once, use forever', 'All future updates included', 'Priority support'].map((t) => (
                  <li key={t} className="flex gap-3 text-[13px] font-light text-white/85">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#9FB6FF' }} />{t}
                  </li>
                ))}
              </ul>
              <Link to="/auth" className="flex items-center justify-center gap-2 w-full h-11 rounded-full font-mono text-[11px] uppercase tracking-[0.2em] transition-all" style={{ background: 'white', color: INK }}>
                Claim Lifetime <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <p className="text-center mt-10 font-mono text-[10px] tracking-[0.25em] uppercase" style={{ color: `${INK}80` }}>
            · activation handled manually within minutes ·
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-6 lg:px-14 py-12" style={{ borderTop: `1px solid ${INK}14` }}>
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6 font-mono text-[10px] tracking-[0.2em] uppercase" style={{ color: `${INK}80` }}>
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Boostly Pro" className="w-7 h-7 rounded-full object-cover" />
            <span className="font-serif text-[14px] tracking-tight normal-case" style={{ color: INK }}>
              Boostly<span className="italic"> Pro</span>
            </span>
          </Link>
          <div className="flex items-center gap-6 flex-wrap justify-center">
            <Link to="/terms" className="hover:opacity-100 opacity-80 transition">terms</Link>
            <Link to="/privacy" className="hover:opacity-100 opacity-80 transition">privacy</Link>
            <Link to="/refund" className="hover:opacity-100 opacity-80 transition">refund</Link>
          </div>
          <span>© 2026 · Boostly Pro</span>
        </div>
      </footer>
    </div>
  );
};

export default Index;
