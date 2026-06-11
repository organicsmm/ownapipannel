import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CheckCircle2, Instagram, Youtube, Music2, Facebook, Twitter, Zap, Shield, Sparkles, TrendingUp, Crown, Quote } from 'lucide-react';
import { PageMeta } from '@/components/seo/PageMeta';
import logo from '@/assets/logo.png';
import heroVideo from '@/assets/hero-money.mp4.asset.json';

const Index = () => {
  return (
    <div className="min-h-screen w-full bg-[#0B1120] text-white font-sans antialiased overflow-x-hidden">
      <PageMeta
        title="Boostly Pro — Premium Social Growth Engine"
        description="Boostly Pro delivers organic, undetectable engagement for serious creators. Multi-platform growth with AI-organic delivery and zero compromise."
        canonicalPath="/"
        breadcrumbs={[{ name: 'Home', path: '/' }]}
      />

      {/* NAV */}
      <nav className="fixed top-0 inset-x-0 z-50 px-6 lg:px-14 py-5 flex items-center justify-between bg-transparent">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={logo} alt="Boostly Pro" className="w-10 h-10 rounded-full object-cover ring-1 ring-white/20" />
          <div className="leading-tight">
            <div className="font-serif text-[20px] tracking-tight text-white">Boostly <span className="italic">Pro</span></div>
            <div className="font-mono text-[9px] tracking-[0.22em] uppercase text-white/50">by daniel brooks</div>
          </div>
        </Link>
        <div className="hidden md:flex items-center gap-10 text-[14px] text-white/90">
          <a href="#features" className="hover:text-white transition-colors">Home</a>
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#platforms" className="hover:text-white transition-colors">Platforms</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          <Link to="/support" className="hover:text-white transition-colors">Support</Link>
        </div>
        <Link to="/auth" className="inline-flex items-center px-6 h-10 rounded-full bg-white text-black text-[13px] font-medium hover:bg-white/90 transition-all">
          Log in
        </Link>
      </nav>

      {/* HERO — dark cinematic with video bg */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center overflow-hidden">
        {/* Video background (transparent placeholder — drop your video src here) */}
        <video
          autoPlay
          loop
          muted
          {...({ 'webkit-playsinline': 'true' } as any)}
          playsInline
          preload="auto"
          disablePictureInPicture
          disableRemotePlayback
          controls={false}
          className="absolute inset-0 w-full h-full object-cover opacity-70 pointer-events-none"
          src={heroVideo.url}
        />
        {/* Dark overlays for legibility */}
        <div aria-hidden className="absolute inset-0 bg-[#070d1a]/60" />
        <div aria-hidden className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 50%, transparent 0%, rgba(11,17,32,0.8) 100%)' }} />

        <div className="relative z-10 max-w-5xl mx-auto pt-24">
          <p className="font-mono text-[11px] tracking-[0.4em] uppercase text-white/60 mb-10">
            Boostly Pro — Private Circle
          </p>
          <h1 className="font-serif text-[clamp(3rem,9vw,7rem)] leading-[0.95] tracking-[-0.02em] text-white">
            Built Different.
          </h1>
          <h1 className="font-serif italic text-[clamp(3rem,9vw,7rem)] leading-[0.95] tracking-[-0.02em] text-white/95 mt-2">
            Paid Different.
          </h1>
          <p className="mt-10 text-[17px] text-white/75 font-light">Quiet money. Loud results.</p>
          <Link
            to="/auth"
            className="mt-10 inline-flex items-center justify-center px-10 h-14 rounded-full bg-white text-black text-[13px] font-semibold tracking-[0.25em] uppercase hover:bg-white/90 transition-all"
          >
            Join Now
          </Link>
          <p className="mt-8 font-mono text-[10px] tracking-[0.35em] uppercase text-white/40">
            Members Only · By Invitation
          </p>
        </div>
      </section>


      {/* HOW IT WORKS — flow diagram */}
      <section id="features" className="px-6 lg:px-14 py-28 border-t border-white/10 bg-[#0B1120]">
        <div className="max-w-[1400px] mx-auto">
          <div className="text-center mb-20">
            <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/40 mb-6">— How it works</p>
            <h2 className="font-serif text-[clamp(2.5rem,6vw,5rem)] leading-[0.95] tracking-[-0.02em] text-white">
              Panel ka pura <span className="italic">flow.</span>
            </h2>
            <p className="mt-6 max-w-2xl mx-auto text-[15px] leading-[1.7] text-white/55 font-light">
              Provider API se lekar organic delivery tak — har step transparent. Niche diagram dekho aur samjho kaise tumhara order behind the scenes chalta hai.
            </p>
          </div>

          {/* Flow diagram */}
          <div className="relative max-w-[1100px] mx-auto">
            {/* STEP 1: Providers */}
            <div className="grid md:grid-cols-3 gap-4 mb-3">
              {['Provider A', 'Provider B', 'Provider C'].map((p, i) => (
                <div key={p} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center">
                  <p className="font-mono text-[9px] tracking-[0.25em] uppercase text-white/40 mb-2">SMM Panel #{i + 1}</p>
                  <p className="font-serif text-[18px] text-white">{p}</p>
                  <p className="text-[11px] text-white/50 mt-1">API key + balance</p>
                </div>
              ))}
            </div>
            <p className="text-center font-mono text-[10px] tracking-[0.2em] uppercase text-white/40 mb-2">Step 1 · Connect provider API keys in admin panel</p>

            {/* Arrow down */}
            <div className="flex justify-center my-6"><div className="w-px h-12 bg-gradient-to-b from-white/40 to-transparent" /></div>

            {/* STEP 2: LRU Rotation Engine */}
            <div className="rounded-2xl border border-white/20 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-8 text-center mb-3">
              <p className="font-mono text-[9px] tracking-[0.25em] uppercase text-white/40 mb-3">Core Engine</p>
              <h3 className="font-serif text-[28px] text-white mb-2">LRU Rotation + Auto Failover</h3>
              <p className="text-[13px] text-white/60 max-w-lg mx-auto">Har order ke liye sabse fresh provider chuna jaata hai. Ek down ho jaaye to dusra automatic le leta hai.</p>
            </div>
            <p className="text-center font-mono text-[10px] tracking-[0.2em] uppercase text-white/40 mb-2">Step 2 · Smart routing, no single point of failure</p>

            <div className="flex justify-center my-6"><div className="w-px h-12 bg-gradient-to-b from-white/40 to-transparent" /></div>

            {/* STEP 3: Service Mapping & Bundles */}
            <div className="grid md:grid-cols-2 gap-4 mb-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <p className="font-mono text-[9px] tracking-[0.25em] uppercase text-white/40 mb-2">Service Mapping</p>
                <h3 className="font-serif text-[22px] text-white mb-2">Provider services → Your services</h3>
                <p className="text-[12px] text-white/55 leading-relaxed">Admin har provider ki service ko apni catalog se map karta hai. Pricing, quality, speed sab control me.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <p className="font-mono text-[9px] tracking-[0.25em] uppercase text-white/40 mb-2">Bundle Builder</p>
                <h3 className="font-serif text-[22px] text-white mb-2">Likes + Views + Followers</h3>
                <p className="text-[12px] text-white/55 leading-relaxed">Multiple services ko ek bundle me pack karo. User ek hi click me poora growth package le.</p>
              </div>
            </div>
            <p className="text-center font-mono text-[10px] tracking-[0.2em] uppercase text-white/40 mb-2">Step 3 · Build catalog & bundles inside admin</p>

            <div className="flex justify-center my-6"><div className="w-px h-12 bg-gradient-to-b from-white/40 to-transparent" /></div>

            {/* STEP 4: Order Modes */}
            <div className="grid md:grid-cols-2 gap-4 mb-3">
              <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-6">
                <p className="font-mono text-[9px] tracking-[0.25em] uppercase text-white/45 mb-2">Mode A · Instant</p>
                <h3 className="font-serif text-[22px] text-white mb-2">Engagement Orders</h3>
                <p className="text-[12px] text-white/55 leading-relaxed">User place karta hai → provider ko forward → fast delivery. Direct, sidha, quick.</p>
              </div>
              <div className="rounded-2xl border border-white/25 bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-6">
                <p className="font-mono text-[9px] tracking-[0.25em] uppercase text-white/45 mb-2">Mode B · Natural</p>
                <h3 className="font-serif text-[22px] text-white mb-2">Organic Delivery</h3>
                <p className="text-[12px] text-white/60 leading-relaxed">S-curve, ±50% variance, peak-hour weighting. Order chhote chunks me schedule hota hai — algorithm ko lagta hai real audience aa rahi hai.</p>
              </div>
            </div>
            <p className="text-center font-mono text-[10px] tracking-[0.2em] uppercase text-white/40 mb-2">Step 4 · User chooses delivery style</p>

            <div className="flex justify-center my-6"><div className="w-px h-12 bg-gradient-to-b from-white/40 to-transparent" /></div>

            {/* STEP 5: Result */}
            <div className="rounded-2xl border border-white/20 bg-white text-[#0B1120] p-8 text-center">
              <p className="font-mono text-[9px] tracking-[0.25em] uppercase text-[#666] mb-3">Final</p>
              <h3 className="font-serif text-[28px] mb-2 text-[#0B1120]">Safe, quiet, undetectable growth</h3>
              <p className="text-[13px] text-[#444] max-w-lg mx-auto">Wallet deduct → order tracked → live status → refill if drop. Full automation.</p>
            </div>
          </div>
        </div>
      </section>


      {/* PLATFORMS */}
      <section id="platforms" className="px-6 lg:px-14 py-28 border-t border-white/10 bg-[#070d1a]">
        <div className="max-w-[1400px] mx-auto">
          <div className="text-center mb-14">
            <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/40 mb-6">— Coverage</p>
            <h2 className="font-serif text-[clamp(2.5rem,6vw,5rem)] leading-[0.95] tracking-[-0.02em] text-white">
              Every platform. <span className="italic">One engine.</span>
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
                <div key={p.name} className="p-6 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/25 transition-all">
                  <Icon className="w-7 h-7 text-white mb-4" />
                  <h3 className="font-serif text-[18px] mb-1 text-white">{p.name}</h3>
                  <p className="text-[11px] font-mono uppercase tracking-wider text-white/40">{p.services}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="px-6 lg:px-14 py-28 border-t border-white/10 bg-[#0B1120]">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-16">
            <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/40 mb-6">— Membership</p>
            <h2 className="font-serif text-[clamp(2.5rem,6vw,5rem)] leading-[0.95] tracking-[-0.02em] text-white">
              Two ways to <span className="italic">begin.</span>
            </h2>
            <p className="mt-6 max-w-xl mx-auto text-[15px] leading-[1.7] text-white/55 font-light">
              Single membership — full platform access. No tiers, no upsells, no hidden gates.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5 max-w-3xl mx-auto">
            {/* Monthly */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 lg:p-10 hover:border-white/25 transition-all">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg border border-white/15 bg-white/[0.04] flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-white/50">Monthly</p>
              </div>
              <h3 className="font-serif text-2xl mb-3 text-white">Monthly Access</h3>
              <div className="flex items-baseline gap-2 mb-8">
                <span className="font-serif text-5xl text-white">$35</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">/ month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {['Full platform access', 'All platforms & services', 'Organic delivery engine', 'Cancel anytime'].map((t) => (
                  <li key={t} className="flex gap-3 text-[13px] text-white/80 font-light">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 text-white/70 shrink-0" />{t}
                  </li>
                ))}
              </ul>
              <Link to="/auth" className="flex items-center justify-center gap-2 w-full h-11 rounded-full border border-white/20 bg-transparent hover:bg-white/5 font-mono text-[11px] uppercase tracking-[0.2em] text-white transition-all">
                Start Monthly <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Lifetime */}
            <div className="relative rounded-2xl border border-white/30 bg-white text-[#0a0a0a] p-8 lg:p-10 shadow-[0_40px_100px_-30px_rgba(255,255,255,0.25)]">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#0B1120] text-white font-mono text-[9px] uppercase tracking-[0.25em] border border-white/10">
                Best Value
              </div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-[#0B1120]/5 border border-[#0B1120]/10 flex items-center justify-center">
                  <Crown className="w-4 h-4 text-[#0a0a0a]" />
                </div>
                <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-[#666]">Lifetime</p>
              </div>
              <h3 className="font-serif text-2xl mb-3">Lifetime Access</h3>
              <div className="flex items-baseline gap-2 mb-8">
                <span className="font-serif text-5xl">$100</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#666]">/ once</span>
              </div>
              <ul className="space-y-3 mb-8">
                {['Everything in monthly', 'Pay once, use forever', 'All future updates included', 'Priority support'].map((t) => (
                  <li key={t} className="flex gap-3 text-[13px] font-light">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 text-[#0B1120] shrink-0" />{t}
                  </li>
                ))}
              </ul>
              <Link to="/auth" className="flex items-center justify-center gap-2 w-full h-11 rounded-full bg-[#0B1120] text-white font-mono text-[11px] uppercase tracking-[0.2em] hover:bg-[#070d1a] transition-all">
                Claim Lifetime <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <p className="text-center mt-10 font-mono text-[10px] tracking-[0.25em] uppercase text-white/40">
            · activation handled manually within minutes ·
          </p>
        </div>
      </section>


      {/* FOOTER */}
      <footer className="px-6 lg:px-14 py-12 border-t border-white/10 bg-[#070d1a]">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6 font-mono text-[10px] tracking-[0.2em] uppercase text-white/40">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Boostly Pro" className="w-7 h-7 rounded-full object-cover ring-1 ring-white/15" />
            <span className="font-serif text-[14px] text-white tracking-tight normal-case">
              Boostly<span className="italic"> Pro</span>
            </span>
          </Link>
          <div className="flex items-center gap-6 flex-wrap justify-center">
            <Link to="/terms" className="hover:text-white transition-colors">terms</Link>
            <Link to="/privacy" className="hover:text-white transition-colors">privacy</Link>
            <Link to="/refund" className="hover:text-white transition-colors">refund</Link>
          </div>
          <span>© 2026 · Boostly Pro</span>
        </div>
      </footer>
    </div>
  );
};

export default Index;

