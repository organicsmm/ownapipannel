import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CheckCircle2, Instagram, Youtube, Music2, Facebook, Twitter, Zap, Shield, Sparkles, TrendingUp, Crown, Quote } from 'lucide-react';
import { PageMeta } from '@/components/seo/PageMeta';
import logo from '@/assets/logo.png';
import heroVideo from '@/assets/hero-money.mp4.asset.json';

const Index = () => {
  return (
    <div className="min-h-screen w-full bg-[#0a0a0a] text-white font-sans antialiased overflow-x-hidden">
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
        <div aria-hidden className="absolute inset-0 bg-black/55" />
        <div aria-hidden className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 50%, transparent 0%, rgba(0,0,0,0.7) 100%)' }} />

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



      {/* BOOSTLY PRO CARD */}
      <section className="relative px-6 lg:px-14 py-24 bg-[#0a0a0a]">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-3xl bg-white text-[#111] shadow-[0_40px_120px_-30px_rgba(0,0,0,0.6)] p-8 sm:p-12">
            {/* Header */}
            <div className="flex items-start gap-5 mb-8">
              <div className="w-14 h-14 rounded-xl bg-[#f4f4f4] flex items-center justify-center shrink-0">
                <TrendingUp className="w-6 h-6 text-[#111]" />
              </div>
              <div>
                <h3 className="font-serif text-[32px] leading-tight tracking-tight">Boostly Pro</h3>
                <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-[#666] mt-1">Premium Engagement Engine</p>
              </div>
            </div>

            <p className="text-[15px] leading-[1.7] text-[#444] font-light mb-10">
              Organic, undetectable growth across Instagram, YouTube, TikTok &amp; more. S-curve
              modelling, ±50% variance, peak-hour weighting &amp; LRU provider rotation.
            </p>

            {/* Feature grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 mb-10">
              {['S-Curve Modelling','Peak-Hour Weighting','Multi-Panel Failover','Bring Your Own Panel API'].map((f)=>(
                <div key={f} className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-[#111] shrink-0" strokeWidth={2.5} />
                  <span className="font-mono text-[12px] tracking-[0.12em] uppercase text-[#111]">{f}</span>
                </div>
              ))}
            </div>

            <div className="h-px bg-[#eee] mb-8" />

            {/* Access / pricing */}
            <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
              <div>
                <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-[#888] mb-2">Access</p>
                <p className="font-serif text-[44px] leading-none tracking-tight">FROM <span className="italic">$20</span></p>
              </div>
              <a href="#pricing" className="inline-flex items-center px-5 h-11 rounded-md border border-[#ddd] font-mono text-[11px] tracking-[0.2em] uppercase text-[#111] hover:bg-[#f7f7f7] transition-all">
                View Pricing
              </a>
            </div>

            {/* Checkout tiles */}
            <div className="grid sm:grid-cols-2 gap-3">
              <Link to="/auth" className="group relative rounded-xl bg-[#0a0a0a] text-white p-5 hover:bg-black transition-all">
                <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-white/70 text-center">Monthly · $20/mo</p>
                <p className="font-serif italic text-[15px] text-center mt-2 text-white inline-flex items-center justify-center gap-1.5 w-full">
                  Checkout <ArrowUpRight className="w-3.5 h-3.5" />
                </p>
              </Link>
              <Link to="/auth" className="group relative rounded-xl bg-[#0a0a0a] text-white p-5 hover:bg-black transition-all">
                <span className="absolute -top-2 right-3 px-2 py-0.5 rounded bg-white text-[#0a0a0a] font-mono text-[8px] tracking-[0.2em] uppercase">Best Value</span>
                <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-white/70 text-center">Lifetime · $100 Once</p>
                <p className="font-serif italic text-[15px] text-center mt-2 text-white inline-flex items-center justify-center gap-1.5 w-full">
                  Checkout <ArrowUpRight className="w-3.5 h-3.5" />
                </p>
              </Link>
            </div>
          </div>
        </div>
      </section>



      {/* FEATURES */}
      <section id="features" className="px-6 lg:px-14 py-28 border-t border-white/10 bg-[#0a0a0a]">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid lg:grid-cols-12 gap-10 mb-16">
            <div className="lg:col-span-5">
              <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/40 mb-6">— Engine</p>
              <h2 className="font-serif text-[clamp(2.5rem,6vw,5rem)] leading-[0.95] tracking-[-0.02em] text-white">
                Built <span className="italic">precisely.</span><br />
                Delivered <span className="italic">quietly.</span>
              </h2>
            </div>
            <div className="lg:col-span-7 lg:pt-14">
              <p className="text-[16px] leading-[1.8] text-white/60 font-light max-w-xl">
                Every order is choreographed against thousands of invisible signals — peak hours,
                organic variance, dwell intervals, regional drift. Reads as life, never as labor.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-white/10 border border-white/10 rounded-2xl overflow-hidden">
            {[
              { icon: TrendingUp, n: '01', t: 'S-curve modelling', d: 'Mathematical growth mirroring organic virality — slow ignition, viral middle, gentle taper.' },
              { icon: Sparkles, n: '02', t: '±50% variance', d: 'No two intervals identical. Quantity, cadence, and timing fluctuate within human bounds.' },
              { icon: Zap, n: '03', t: 'Peak-hour weighting', d: 'Activity weighted to 6–10 PM local. Night slowdowns mimic real audience sleep.' },
              { icon: Shield, n: '04', t: 'LRU provider rotation', d: 'Multiple providers, rotating priority, automatic failover. Never single-point-fragile.' },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.n} className="bg-[#0a0a0a] p-8 lg:p-10">
                  <div className="flex items-center justify-between mb-6">
                    <Icon className="w-5 h-5 text-white" />
                    <p className="font-mono text-[10px] tracking-[0.25em] text-white/40">:{f.n}</p>
                  </div>
                  <h3 className="font-serif text-[24px] leading-tight mb-3 text-white">{f.t}</h3>
                  <p className="text-[13px] leading-[1.7] text-white/55 font-light">{f.d}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* PLATFORMS */}
      <section id="platforms" className="px-6 lg:px-14 py-28 border-t border-white/10 bg-[#080808]">
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
      <section id="pricing" className="px-6 lg:px-14 py-28 border-t border-white/10 bg-[#0a0a0a]">
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
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#0a0a0a] text-white font-mono text-[9px] uppercase tracking-[0.25em] border border-white/10">
                Best Value
              </div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-[#0a0a0a]/5 border border-[#0a0a0a]/10 flex items-center justify-center">
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
                    <CheckCircle2 className="w-4 h-4 mt-0.5 text-[#0a0a0a] shrink-0" />{t}
                  </li>
                ))}
              </ul>
              <Link to="/auth" className="flex items-center justify-center gap-2 w-full h-11 rounded-full bg-[#0a0a0a] text-white font-mono text-[11px] uppercase tracking-[0.2em] hover:bg-black transition-all">
                Claim Lifetime <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <p className="text-center mt-10 font-mono text-[10px] tracking-[0.25em] uppercase text-white/40">
            · activation handled manually within minutes ·
          </p>
        </div>
      </section>

      {/* FOUNDER NOTE */}
      <section className="px-6 lg:px-14 py-28 border-t border-white/10 bg-[#080808]">
        <div className="max-w-[900px] mx-auto">
          <Quote className="w-10 h-10 text-white/25 mb-8" />
          <p className="font-serif text-[clamp(1.5rem,3.5vw,2.5rem)] leading-[1.35] tracking-tight text-white/90">
            "I built Boostly Pro after watching creator after creator get burned by panels that promise growth and deliver bans. Every line of this platform exists to do one thing — make algorithms feel safe with you. <span className="italic text-white">Quiet. Patient. Human.</span>"
          </p>
          <div className="mt-10 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full border border-white/15 bg-white/[0.04] flex items-center justify-center font-serif text-lg text-white italic">D</div>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/85">Daniel Brooks · founder</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40 mt-0.5">building boostly since 2024</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 lg:px-14 py-32 border-t border-white/10 bg-[#0a0a0a] relative overflow-hidden">
        <div aria-hidden className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(255,255,255,0.06), transparent 70%)' }} />
        <div className="max-w-[1400px] mx-auto text-center relative">
          <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/40 mb-8">— Commence</p>
          <h2 className="font-serif text-[clamp(3rem,9vw,8rem)] leading-[0.92] tracking-[-0.03em] mb-12 text-white">
            Quiet power.<br />
            <span className="italic">Loud results.</span>
          </h2>
          <Link to="/auth" className="inline-flex items-center gap-2 px-10 h-14 rounded-full bg-white text-[#0a0a0a] font-mono text-xs uppercase tracking-[0.25em] hover:bg-white/90 transition-all">
            Begin with Boostly Pro <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-6 lg:px-14 py-12 border-t border-white/10 bg-[#080808]">
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

