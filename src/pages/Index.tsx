import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CheckCircle2, Instagram, Youtube, Music2, Facebook, Twitter, Zap, Shield, Sparkles, TrendingUp, Crown, Quote } from 'lucide-react';
import { PageMeta } from '@/components/seo/PageMeta';
import logo from '@/assets/logo.png';

const Index = () => {
  return (
    <div className="min-h-screen w-full bg-background text-foreground font-sans antialiased overflow-x-hidden">
      <PageMeta
        title="Boostly Pro — Premium Social Growth Engine"
        description="Boostly Pro delivers organic, undetectable engagement for serious creators. Multi-platform growth with AI-organic delivery and zero compromise."
        canonicalPath="/"
        breadcrumbs={[{ name: 'Home', path: '/' }]}
      />

      {/* NAV */}
      <nav className="fixed top-0 inset-x-0 z-50 px-6 lg:px-14 py-5 flex items-center justify-between backdrop-blur-xl bg-background/70 border-b border-border/50">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={logo} alt="Boostly Pro" className="w-9 h-9 rounded-lg object-contain" />
          <span className="font-serif text-[18px] tracking-tight">
            Boostly<span className="text-primary italic"> Pro</span>
          </span>
        </Link>
        <div className="hidden md:flex items-center gap-8 text-[12px] font-mono tracking-[0.18em] uppercase">
          <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">features</a>
          <a href="#platforms" className="text-muted-foreground hover:text-foreground transition-colors">platforms</a>
          <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">pricing</a>
        </div>
        <Link to="/auth" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-[12px] font-mono uppercase tracking-[0.15em] hover:shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.6)] transition-all">
          start free <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </nav>

      {/* HERO */}
      <section className="min-h-screen flex flex-col justify-center px-6 lg:px-14 pt-32 pb-20 relative">
        <div aria-hidden className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, hsl(var(--primary) / 0.12), transparent 70%)' }} />
        <div className="relative max-w-[1400px] mx-auto w-full text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-card/60 backdrop-blur mb-10">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-primary animate-ping opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
              live — 2,400+ creators growing now
            </span>
          </div>

          <h1 className="font-serif text-[clamp(3rem,11vw,10rem)] leading-[0.92] tracking-[-0.04em]">
            Boostly <span className="italic text-primary">Pro</span>
          </h1>
          <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.3em] text-primary">
            · premium engagement engine ·
          </p>
          <p className="mt-10 max-w-xl mx-auto text-[16px] leading-[1.7] text-muted-foreground font-light">
            Organic, undetectable growth across Instagram, YouTube, TikTok and beyond.
            Built for creators who demand quiet machinery and loud results.
          </p>

          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/auth" className="inline-flex items-center gap-2 px-7 h-12 rounded-md bg-primary text-primary-foreground font-mono text-xs uppercase tracking-[0.2em] hover:shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.7)] transition-all">
              Start free trial <ArrowUpRight className="w-4 h-4" />
            </Link>
            <Link to="/services" className="inline-flex items-center gap-2 px-7 h-12 rounded-md border border-border bg-card/40 font-mono text-xs uppercase tracking-[0.2em] hover:bg-card hover:border-primary/40 transition-all">
              Explore services
            </Link>
          </div>

          <div className="mt-10 flex items-center justify-center gap-6 flex-wrap font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <span className="flex items-center gap-1.5"><Shield className="w-3 h-3 text-primary" /> zero bans</span>
            <span className="flex items-center gap-1.5"><Zap className="w-3 h-3 text-primary" /> instant start</span>
            <span className="flex items-center gap-1.5"><Sparkles className="w-3 h-3 text-primary" /> ai-organic</span>
          </div>

          <div className="mt-20 overflow-hidden border-y border-border py-6 bg-card/30">
            <div className="flex items-center justify-around gap-12 font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground flex-wrap">
              <span className="flex items-center gap-2"><Instagram className="w-4 h-4 text-primary" /> Instagram</span>
              <span className="flex items-center gap-2"><Youtube className="w-4 h-4 text-primary" /> YouTube</span>
              <span className="flex items-center gap-2"><Music2 className="w-4 h-4 text-primary" /> TikTok</span>
              <span className="flex items-center gap-2"><Facebook className="w-4 h-4 text-primary" /> Facebook</span>
              <span className="flex items-center gap-2"><Twitter className="w-4 h-4 text-primary" /> Twitter / X</span>
            </div>
          </div>

          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-px bg-border border border-border rounded-lg overflow-hidden">
            {[
              { k: 'Orders', v: '50K+', sub: 'delivered' },
              { k: 'Creators', v: '2,400+', sub: 'active' },
              { k: 'Bans', v: '00', sub: 'zero reported' },
              { k: 'Uptime', v: '99.9%', sub: 'guaranteed' },
            ].map((s) => (
              <div key={s.k} className="bg-background p-6 lg:p-8 text-left">
                <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-primary mb-3">:{s.k.toLowerCase()}</p>
                <p className="font-serif text-[40px] lg:text-[56px] leading-none">{s.v}</p>
                <p className="mt-2 text-[11px] text-muted-foreground font-mono uppercase tracking-wider">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="px-6 lg:px-14 py-32 border-t border-border">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid lg:grid-cols-12 gap-10 mb-20">
            <div className="lg:col-span-5">
              <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-primary mb-6">:01 / engine</p>
              <h2 className="font-serif text-[clamp(2.5rem,6vw,5rem)] leading-[0.95] tracking-[-0.03em]">
                Built <span className="italic text-primary">precisely.</span><br />
                Delivered <span className="italic text-primary">quietly.</span>
              </h2>
            </div>
            <div className="lg:col-span-7 lg:pt-14">
              <p className="text-[16px] leading-[1.8] text-muted-foreground font-light max-w-xl">
                Every order is choreographed against thousands of invisible signals — peak hours,
                organic variance, dwell intervals, regional drift. Reads as life, never as labor.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border rounded-lg overflow-hidden">
            {[
              { icon: TrendingUp, n: '01', t: 'S-curve modelling', d: 'Mathematical growth mirroring organic virality — slow ignition, viral middle, gentle taper.' },
              { icon: Sparkles, n: '02', t: '±50% variance', d: 'No two intervals identical. Quantity, cadence, and timing fluctuate within human bounds.' },
              { icon: Zap, n: '03', t: 'Peak-hour weighting', d: 'Activity weighted to 6–10 PM local. Night slowdowns mimic real audience sleep.' },
              { icon: Shield, n: '04', t: 'LRU provider rotation', d: 'Multiple providers, rotating priority, automatic failover. Never single-point-fragile.' },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.n} className="bg-background p-8 lg:p-10">
                  <div className="flex items-center justify-between mb-6">
                    <Icon className="w-5 h-5 text-primary" />
                    <p className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground">:{f.n}</p>
                  </div>
                  <h3 className="font-serif text-[24px] leading-tight mb-3">{f.t}</h3>
                  <p className="text-[13px] leading-[1.7] text-muted-foreground font-light">{f.d}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* PLATFORMS */}
      <section id="platforms" className="px-6 lg:px-14 py-32 border-t border-border bg-card/20">
        <div className="max-w-[1400px] mx-auto">
          <div className="text-center mb-16">
            <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-primary mb-6">:02 / coverage</p>
            <h2 className="font-serif text-[clamp(2.5rem,6vw,5rem)] leading-[0.95] tracking-[-0.03em]">
              Every platform. <span className="italic text-primary">One engine.</span>
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
                <div key={p.name} className="p-6 rounded-lg border border-border bg-background hover:border-primary/40 hover:bg-card transition-all">
                  <Icon className="w-7 h-7 text-primary mb-4" />
                  <h3 className="font-serif text-[18px] mb-1">{p.name}</h3>
                  <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">{p.services}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="px-6 lg:px-14 py-32 border-t border-border bg-card/20 relative overflow-hidden">
        <div aria-hidden className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 50% 40% at 50% 0%, hsl(var(--primary) / 0.10), transparent 70%)' }} />
        <div className="max-w-[1200px] mx-auto relative">
          <div className="text-center mb-16">
            <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-primary mb-6">:03 / membership</p>
            <h2 className="font-serif text-[clamp(2.5rem,6vw,5rem)] leading-[0.95] tracking-[-0.03em]">
              Two ways to <span className="italic text-primary">begin.</span>
            </h2>
            <p className="mt-6 max-w-xl mx-auto text-[15px] leading-[1.7] text-muted-foreground font-light">
              Single membership — full platform access. No tiers, no upsells, no hidden gates.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5 max-w-3xl mx-auto">
            <div className="rounded-2xl border border-border bg-background p-8 lg:p-10 hover:border-primary/40 transition-all">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-10 h-10 rounded-lg border border-border bg-card flex items-center justify-center">
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground">monthly</p>
              </div>
              <h3 className="font-serif text-2xl mb-2">Monthly Access</h3>
              <div className="flex items-baseline gap-2 mb-8">
                <span className="font-serif text-5xl">$35</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">/ month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {['Full platform access', 'All platforms & services', 'Organic delivery engine', 'Cancel anytime'].map((t) => (
                  <li key={t} className="flex gap-3 text-[13px] text-foreground/80 font-light">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 text-primary shrink-0" />{t}
                  </li>
                ))}
              </ul>
              <Link to="/auth" className="flex items-center justify-center gap-2 w-full h-11 rounded-md border border-border bg-card/40 hover:bg-card font-mono text-[11px] uppercase tracking-[0.2em] transition-all">
                start monthly <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="relative rounded-2xl border-2 border-primary/50 bg-background p-8 lg:p-10 shadow-[0_30px_80px_-30px_hsl(var(--primary)/0.5)]">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground font-mono text-[9px] uppercase tracking-[0.25em]">
                best value
              </div>
              <div className="flex items-center gap-2 mb-5">
                <div className="w-10 h-10 rounded-lg border border-primary/30 bg-primary/10 flex items-center justify-center">
                  <Crown className="w-4 h-4 text-primary" />
                </div>
                <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-primary">lifetime</p>
              </div>
              <h3 className="font-serif text-2xl mb-2">Lifetime Access</h3>
              <div className="flex items-baseline gap-2 mb-8">
                <span className="font-serif text-5xl">$100</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">/ once</span>
              </div>
              <ul className="space-y-3 mb-8">
                {['Everything in monthly', 'Pay once, use forever', 'All future updates included', 'Priority support'].map((t) => (
                  <li key={t} className="flex gap-3 text-[13px] text-foreground/80 font-light">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 text-primary shrink-0" />{t}
                  </li>
                ))}
              </ul>
              <Link to="/auth" className="flex items-center justify-center gap-2 w-full h-11 rounded-md bg-primary text-primary-foreground font-mono text-[11px] uppercase tracking-[0.2em] hover:shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.7)] transition-all">
                claim lifetime <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <p className="text-center mt-10 font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
            · activation handled manually within minutes ·
          </p>
        </div>
      </section>

      {/* FOUNDER NOTE */}
      <section className="px-6 lg:px-14 py-32 border-t border-border">
        <div className="max-w-[900px] mx-auto">
          <Quote className="w-10 h-10 text-primary/40 mb-8" />
          <p className="font-serif text-[clamp(1.5rem,3.5vw,2.5rem)] leading-[1.35] tracking-tight">
            "I built Boostly Pro after watching creator after creator get burned by panels that promise growth and deliver bans. Every line of this platform exists to do one thing — make algorithms feel safe with you. <span className="text-primary italic">Quiet. Patient. Human.</span>"
          </p>
          <div className="mt-10 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full border border-border bg-card flex items-center justify-center font-serif text-lg text-primary italic">D</div>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em]">Daniel Brooks · founder</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-0.5">building boostly since 2024</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 lg:px-14 py-32 border-t border-border relative overflow-hidden">
        <div aria-hidden className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, hsl(var(--primary) / 0.08), transparent 70%)' }} />
        <div className="max-w-[1400px] mx-auto text-center relative">
          <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-primary mb-8">:04 / commence</p>
          <h2 className="font-serif text-[clamp(3rem,9vw,8rem)] leading-[0.92] tracking-[-0.04em] mb-12">
            Quiet power.<br />
            <span className="italic text-primary">Loud results.</span>
          </h2>
          <Link to="/auth" className="inline-flex items-center gap-2 px-8 h-14 rounded-md bg-primary text-primary-foreground font-mono text-xs uppercase tracking-[0.2em] hover:shadow-[0_30px_80px_-20px_hsl(var(--primary)/0.7)] transition-all">
            Begin with Boostly Pro <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-6 lg:px-14 py-12 border-t border-border">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6 font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Boostly Pro" className="w-7 h-7 rounded object-contain" />
            <span className="font-serif text-[14px] text-foreground tracking-tight normal-case">
              Boostly<span className="text-primary italic"> Pro</span>
            </span>
          </Link>
          <div className="flex items-center gap-6 flex-wrap justify-center">
            <Link to="/terms" className="hover:text-foreground transition-colors">terms</Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">privacy</Link>
            <Link to="/refund" className="hover:text-foreground transition-colors">refund</Link>
          </div>
          <span>© 2026 · Boostly Pro</span>
        </div>
      </footer>
    </div>
  );
};

export default Index;
