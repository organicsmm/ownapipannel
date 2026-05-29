import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { PageMeta } from '@/components/seo/PageMeta';

const Index = () => {
  return (
    <div className="min-h-screen w-full bg-background text-foreground font-sans antialiased overflow-x-hidden">
      <PageMeta
        title="Boostly Pro — Luxury Engagement Platform"
        description="Boostly Pro delivers natural, undetectable engagement for serious creators. Obsidian-grade reliability, AI-organic delivery, zero compromise."
        canonicalPath="/"
        breadcrumbs={[{ name: 'Home', path: '/' }]}
      />

      {/* ═══ NAV ═══ */}
      <nav className="fixed top-0 inset-x-0 z-50 px-8 lg:px-14 py-6 flex items-center justify-between text-[12px] font-mono tracking-[0.18em] uppercase">
        <div className="flex items-center gap-10">
          <a href="#product" className="text-foreground"><span className="text-primary">:</span>product</a>
          <a href="#how" className="text-muted-foreground hover:text-foreground transition-colors hidden md:inline"><span className="text-primary">:</span>system</a>
          <a href="#why" className="text-muted-foreground hover:text-foreground transition-colors hidden md:inline"><span className="text-primary">:</span>protocol</a>
        </div>

        <Link to="/" className="hidden md:flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
          <span className="font-serif italic text-primary text-[20px] leading-none">v</span>
          <span className="text-foreground tracking-[0.3em] text-[13px]">VOTING·PRO</span>
        </Link>

        <div className="flex items-center gap-6">
          <Link to="/auth" className="text-muted-foreground hover:text-foreground transition-colors hidden md:inline">sign in</Link>
          <Link to="/auth" className="text-foreground"><span className="text-primary">:</span>begin →</Link>
        </div>
      </nav>

      {/* ═══ HERO — monumental ═══ */}
      <section className="min-h-screen flex flex-col justify-center px-8 lg:px-14 pt-32 pb-24 relative lux-grain">
        {/* Subtle ambient gradient — not orbs */}
        <div aria-hidden className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, hsla(66, 70%, 60%, 0.04), transparent 70%)' }} />

        <div className="relative max-w-[1400px] mx-auto w-full">
          {/* Top eyebrow row */}
          <div className="flex justify-between items-start mb-20 font-mono text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
            <div className="flex flex-col gap-1">
              <span>:est. 2024</span>
              <span className="text-foreground/40">·new delhi / global</span>
            </div>
            <div className="hidden md:flex flex-col items-end gap-1">
              <span>:edition 02</span>
              <span className="text-primary">·active</span>
            </div>
          </div>

          {/* Wordmark */}
          <div className="text-center animate-fade-up">
            <p className="lux-eyebrow mb-6">:engagement intelligence platform</p>

            <h1 className="font-serif text-[clamp(3.5rem,12vw,11rem)] leading-[0.95] tracking-[-0.04em] text-foreground">
              Voting <span className="italic text-primary">Pro</span>
            </h1>

            <p className="mt-10 max-w-xl mx-auto text-[15px] leading-[1.7] text-muted-foreground font-light">
              An obsidian-grade engagement platform engineered for creators who refuse the obvious.
              Quiet machinery, precise delivery, undetectable patterns.
            </p>

            <div className="mt-12 flex items-center justify-center gap-8 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <span><span className="text-primary">·</span> ai-organic</span>
              <span className="w-px h-3 bg-border" />
              <span><span className="text-primary">·</span> zero detection</span>
              <span className="w-px h-3 bg-border" />
              <span><span className="text-primary">·</span> 99.9% uptime</span>
            </div>

            <div className="mt-14 flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-up" style={{ animationDelay: '0.2s' }}>
              <Link to="/auth" className="btn-primary group">
                Begin trial
                <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
              <Link to="/services" className="btn-ghost">View services</Link>
            </div>
          </div>

          {/* Bottom stat strip — Shaga-style */}
          <div className="mt-24 lg:mt-32 grid grid-cols-2 md:grid-cols-4 gap-px bg-border border border-border rounded-lg overflow-hidden">
            {[
              { k: 'Orders', v: '50K+', sub: 'delivered' },
              { k: 'Creators', v: '2,400+', sub: 'active' },
              { k: 'Bans', v: '00', sub: 'zero reported' },
              { k: 'Success', v: '99.9%', sub: 'guaranteed' },
            ].map((s) => (
              <div key={s.k} className="bg-background p-6 lg:p-8">
                <p className="lux-eyebrow mb-3">:{s.k.toLowerCase()}</p>
                <p className="font-serif text-[40px] lg:text-[56px] leading-none text-foreground">{s.v}</p>
                <p className="mt-2 text-[11px] text-muted-foreground font-mono uppercase tracking-wider">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PROTOCOL — How it works ═══ */}
      <section id="how" className="px-8 lg:px-14 py-32 border-t border-border">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid lg:grid-cols-12 gap-10 mb-20">
            <div className="lg:col-span-5">
              <p className="lux-eyebrow mb-6">:01 / protocol</p>
              <h2 className="font-serif text-[clamp(2.5rem,6vw,5rem)] leading-[0.95] tracking-[-0.03em]">
                Engineered<br />
                <span className="italic text-primary">in silence.</span>
              </h2>
            </div>
            <div className="lg:col-span-7 lg:pt-14">
              <p className="text-[16px] leading-[1.8] text-muted-foreground font-light max-w-xl">
                Every delivery is choreographed against a thousand invisible signals — peak hours,
                organic variance, dwell intervals, regional drift. The result reads as life, not labor.
              </p>
            </div>
          </div>

          {/* Specs grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border">
            {[
              { n: '01', t: 'S-curve modelling', d: 'Mathematical growth that mirrors organic virality — slow ignition, viral middle, gentle taper.' },
              { n: '02', t: '±50% variance', d: 'No two intervals identical. Quantity, cadence, and timing fluctuate within human bounds.' },
              { n: '03', t: 'Peak-hour weighting', d: 'Activity weighted to 6–10 PM local. Night-time slowdowns mimic real audience sleep.' },
              { n: '04', t: 'LRU provider rotation', d: 'Multiple providers, rotating priority, automatic failover. Never single-point-fragile.' },
            ].map((f) => (
              <div key={f.n} className="bg-background p-8 lg:p-10 group hover:bg-card transition-colors duration-300">
                <p className="font-mono text-[10px] tracking-[0.25em] text-primary mb-6">:{f.n}</p>
                <h3 className="font-serif text-[26px] leading-tight mb-3 text-foreground">{f.t}</h3>
                <p className="text-[13px] leading-[1.7] text-muted-foreground font-light">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ COMPARISON ═══ */}
      <section id="why" className="px-8 lg:px-14 py-32 border-t border-border">
        <div className="max-w-[1400px] mx-auto">
          <div className="text-center mb-20">
            <p className="lux-eyebrow mb-6">:02 / contrast</p>
            <h2 className="font-serif text-[clamp(2.5rem,6vw,5rem)] leading-[0.95] tracking-[-0.03em]">
              The difference is <span className="italic text-primary">obvious.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-px bg-border border border-border">
            <div className="bg-background p-10 lg:p-14">
              <p className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground mb-8">:standard panels</p>
              <ul className="space-y-5">
                {[
                  'Identical batches every cycle',
                  'Fixed intervals, visible bot signature',
                  'Round-the-clock delivery — never sleeps',
                  'Account flagging within 30 days',
                ].map((t) => (
                  <li key={t} className="flex gap-4 text-[14px] text-muted-foreground font-light leading-relaxed">
                    <span className="text-destructive shrink-0">—</span>{t}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-background p-10 lg:p-14 relative">
              <p className="font-mono text-[10px] tracking-[0.25em] text-primary mb-8">:boostly pro</p>
              <ul className="space-y-5">
                {[
                  'Variable batches — reads like real users',
                  'Jittered timing — algorithmically invisible',
                  'Peak-weighted, night-aware — fully human',
                  'Zero bans across 50,000+ orders',
                ].map((t) => (
                  <li key={t} className="flex gap-4 text-[14px] text-foreground/85 font-light leading-relaxed">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 text-primary shrink-0" />{t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="px-8 lg:px-14 py-32 border-t border-border">
        <div className="max-w-[1400px] mx-auto text-center">
          <p className="lux-eyebrow mb-8">:03 / commence</p>
          <h2 className="font-serif text-[clamp(3rem,9vw,8rem)] leading-[0.95] tracking-[-0.04em] mb-12">
            Quiet power.<br />
            <span className="italic text-primary">Loud results.</span>
          </h2>
          <Link to="/auth" className="btn-primary group">
            Begin your edition
            <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
          <p className="mt-8 font-mono text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
            no credit card · full access · cancel anytime
          </p>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="px-8 lg:px-14 py-12 border-t border-border">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6 font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-serif italic text-primary text-[16px] leading-none">v</span>
            <span className="text-foreground tracking-[0.3em]">VOTING·PRO</span>
          </div>
          <div className="flex items-center gap-6 flex-wrap justify-center">
            <Link to="/terms" className="hover:text-foreground transition-colors">terms</Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">privacy</Link>
            <Link to="/refund" className="hover:text-foreground transition-colors">refund</Link>
            <Link to="/cookies" className="hover:text-foreground transition-colors">cookies</Link>
          </div>
          <span>© 2026 · edition 02</span>
        </div>
      </footer>
    </div>
  );
};

export default Index;
