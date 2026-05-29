import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, TrendingUp, Zap, Shield, BarChart3, CheckCircle2, Shuffle,
  Clock, Moon, Timer, Eye, ChevronRight, Sparkles, Star, Vote, Rocket,
  Activity, Layers3,
} from 'lucide-react';
import logo from '@/assets/logo.jpg';
import { PageMeta } from '@/components/seo/PageMeta';

const Pill: React.FC<{ children: React.ReactNode; tone?: 'mint' | 'glass' }> = ({ children, tone = 'mint' }) => (
  <span
    className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] sm:text-[12px] font-semibold uppercase tracking-[0.14em] ${
      tone === 'mint'
        ? 'bg-primary/10 text-primary border border-primary/30'
        : 'bg-white/5 text-foreground/80 border border-white/10'
    }`}
  >
    {children}
  </span>
);

const Index = () => {
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-background text-foreground font-sans relative">
      <PageMeta
        title="Voting Pro — Powerful Organic Growth Platform"
        description="Voting Pro delivers natural, undetectable engagement for Instagram, YouTube, TikTok and more. 100% safe accounts, AI-organic delivery."
        canonicalPath="/"
        breadcrumbs={[{ name: 'Home', path: '/' }]}
      />

      {/* ═══ AMBIENT ORBS ═══ */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="orb orb-mint w-[600px] h-[600px] -top-40 -left-32 animate-orb-drift" />
        <div className="orb orb-bright w-[500px] h-[500px] top-1/3 -right-32 animate-orb-drift" style={{ animationDelay: '4s' }} />
        <div className="orb orb-forest w-[700px] h-[700px] bottom-0 left-1/4 animate-orb-drift" style={{ animationDelay: '8s' }} />
        <div className="absolute inset-0 bg-grid opacity-30" />
      </div>

      {/* ═══ NAV ═══ */}
      <nav className="sticky top-3 z-50 w-full px-3 sm:px-4">
        <div className="max-w-6xl mx-auto rounded-2xl flex items-center justify-between h-14 px-3 sm:px-4 glass-panel">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="relative">
              <div className="absolute -inset-1 rounded-2xl opacity-70 blur-md transition-opacity group-hover:opacity-100 bg-gradient-to-br from-primary to-accent" />
              <div className="relative w-9 h-9 rounded-xl flex items-center justify-center bg-card border border-primary/30">
                <Vote className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div className="flex items-center gap-2 leading-none">
              <span className="text-[15px] sm:text-[16px] font-bold tracking-tight font-display">Voting Pro</span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.16em] px-1.5 py-[3px] rounded-md bg-primary/15 text-primary border border-primary/20">
                v2.0
              </span>
            </div>
          </Link>
          <div className="hidden md:flex items-center gap-7">
            {['Features', 'How it works', 'Why us'].map((t, i) => (
              <a key={t} href={['#features', '#how-it-works', '#comparison'][i]}
                className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors">
                {t}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Link to="/auth" className="hidden sm:inline-flex h-9 px-3.5 items-center text-[13px] font-semibold text-muted-foreground hover:text-foreground transition-colors">
              Sign in
            </Link>
            <Link to="/auth" className="btn-3d h-10 px-5 text-[13px] inline-flex items-center gap-1.5">
              Get Started <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="pt-16 sm:pt-24 lg:pt-32 pb-12 sm:pb-20 text-center px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 mb-6 animate-fade-up">
            <Pill>
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-primary" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
              </span>
              Voting Pro v2.0 — Live now
            </Pill>
          </div>

          <h1 className="font-display text-[2.6rem] sm:text-6xl lg:text-[5rem] font-extrabold leading-[1.02] tracking-[-0.035em] mb-6 text-balance animate-fade-up" style={{ animationDelay: '0.1s' }}>
            Engineered for
            <br className="hidden sm:block" />
            <span className="gradient-text glow-mint-text">unstoppable growth.</span>
          </h1>

          <p className="text-[15px] sm:text-[18px] leading-[1.7] mb-10 max-w-2xl mx-auto text-muted-foreground animate-fade-up" style={{ animationDelay: '0.2s' }}>
            AI-organic delivery patterns that move like real humans. Natural variance, peak-hour
            intelligence, zero detection. <span className="text-foreground font-semibold">Built for serious creators.</span>
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10 animate-fade-up" style={{ animationDelay: '0.3s' }}>
            <Link to="/auth" className="btn-3d w-full sm:w-auto h-12 px-7 text-[14.5px] gap-2 animate-pulse-mint">
              <Rocket className="w-4 h-4" /> Launch your growth
            </Link>
            <Link to="/auth" className="btn-glass w-full sm:w-auto h-12 px-7 text-[14.5px] inline-flex items-center justify-center gap-2">
              Explore services <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="flex items-center justify-center gap-x-5 gap-y-2 flex-wrap text-[12px] sm:text-[13px] font-medium text-muted-foreground animate-fade-up" style={{ animationDelay: '0.4s' }}>
            {['No credit card', 'All features included', '60-second setup'].map((t) => (
              <span key={t} className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> {t}</span>
            ))}
          </div>

          {/* social proof */}
          <div className="mt-14 flex items-center justify-center gap-6 sm:gap-10 flex-wrap animate-fade-up" style={{ animationDelay: '0.5s' }}>
            <div className="flex items-center gap-1.5">
              {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-current text-warning" />)}
              <span className="text-[12.5px] font-semibold ml-1">4.9/5</span>
              <span className="text-[12px] text-muted-foreground">· 2,400+ creators</span>
            </div>
            <span className="hidden sm:inline-block w-px h-5 bg-border" />
            <span className="text-[12.5px] text-muted-foreground">
              <strong className="text-foreground font-bold">50,000+</strong> orders delivered
            </span>
            <span className="hidden sm:inline-block w-px h-5 bg-border" />
            <span className="text-[12.5px] text-muted-foreground">
              <strong className="text-primary font-bold">99.9%</strong> success rate
            </span>
          </div>
        </div>
      </section>

      {/* ═══ FEATURES BENTO ═══ */}
      <section id="features" className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <Pill><Zap className="w-3 h-3" /> Features no other panel has</Pill>
            <h2 className="mt-4 font-display text-[2rem] sm:text-5xl font-bold tracking-tight text-balance">
              Engineered to feel <span className="gradient-text">perfectly natural</span>
            </h2>
          </div>

          {/* Bento grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 perspective-1000">
            {/* Large card */}
            <div className="three-d-card col-span-2 sm:col-span-2 lg:col-span-3 row-span-2 p-6 sm:p-8 flex flex-col justify-between min-h-[280px] relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-radial-mint opacity-60" />
              <div className="relative">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-primary/15 border border-primary/30">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display text-2xl font-bold mb-2">S-Curve Growth</h3>
                <p className="text-[13.5px] text-muted-foreground leading-relaxed">
                  Slow start, viral middle, gentle taper. The exact growth curve real content follows — modelled mathematically.
                </p>
              </div>
              <div className="relative mt-4 h-20 flex items-end gap-1">
                {[8, 12, 18, 28, 42, 60, 78, 88, 94, 96, 97].map((h, i) => (
                  <div key={i} className="flex-1 rounded-t-sm bg-gradient-to-t from-primary/40 to-primary/80" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>

            {[
              { icon: Shuffle, title: '±50% Variance', desc: 'Random qty per drop' },
              { icon: Clock, title: 'Peak Boost', desc: '1.5× at 6–10 PM' },
              { icon: Moon, title: 'Night Slowdown', desc: 'Realistic sleep' },
              { icon: Timer, title: '±5min Jitter', desc: 'Anti-detection' },
              { icon: Eye, title: 'Live Preview', desc: 'See before order' },
              { icon: Layers3, title: 'Multi-Provider', desc: 'LRU rotation' },
            ].map((f) => (
              <div key={f.title} className="three-d-card col-span-1 lg:col-span-1 p-4 sm:p-5 text-left">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 bg-primary/10 border border-primary/20">
                  <f.icon className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-[13px] font-bold mb-1 font-display">{f.title}</h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ COMPARISON ═══ */}
      <section id="comparison" className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto glass-premium rounded-3xl overflow-hidden">
          <div className="grid md:grid-cols-2">
            {/* Regular */}
            <div className="p-6 sm:p-10 border-r border-white/5">
              <div className="flex items-center gap-2.5 mb-6">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-destructive/15 border border-destructive/30">
                  <span className="text-[18px] text-destructive font-bold">×</span>
                </div>
                <span className="text-[15px] font-bold font-display text-muted-foreground">Regular SMM Panels</span>
              </div>
              <div className="space-y-3">
                {[
                  'Same quantity every batch — easy to detect',
                  'Fixed intervals — bot pattern visible',
                  '24/7 delivery — unnatural behavior',
                  'Accounts get flagged & banned',
                ].map((t) => (
                  <div key={t} className="flex items-start gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 bg-destructive" />
                    <span className="text-[13px] leading-relaxed text-muted-foreground">{t}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Us */}
            <div className="p-6 sm:p-10 relative bg-gradient-to-br from-primary/10 via-transparent to-accent/5">
              <span className="absolute top-5 right-5 text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md bg-primary text-primary-foreground">
                Voting Pro
              </span>
              <div className="flex items-center gap-2.5 mb-6">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary/20 border border-primary/40">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                </div>
                <span className="text-[15px] font-bold font-display">Voting Pro</span>
              </div>
              <div className="space-y-3">
                {[
                  'Random variance — looks like real users',
                  'Jittered timing — undetectable patterns',
                  'Peak hours + night slow — human behavior',
                  '100% safe, zero bans reported',
                ].map((t) => (
                  <div key={t} className="flex items-start gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 bg-primary" />
                    <span className="text-[13px] leading-relaxed text-foreground/90">{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-6 sm:gap-10 flex-wrap py-5 px-6 border-t border-white/5 bg-black/20">
            {[
              { icon: '🏆', text: '50,000+ Orders Delivered' },
              { icon: '🛡️', text: 'Zero Account Bans' },
              { icon: '⚡', text: '99.9% Success Rate' },
            ].map((s) => (
              <span key={s.text} className="flex items-center gap-2 text-[12.5px] font-semibold text-muted-foreground">
                <span>{s.icon}</span> {s.text}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ WHY ═══ */}
      <section id="how-it-works" className="py-14 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <Pill tone="glass">Why choose Voting Pro</Pill>
            <h2 className="mt-4 font-display text-[2rem] sm:text-5xl font-bold tracking-tight text-balance">
              Built for <span className="gradient-text">real growth</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {[
              { icon: TrendingUp, title: 'Natural growth curves', desc: 'Variable delivery quantities that perfectly mimic real organic engagement patterns.' },
              { icon: Zap, title: 'Peak hour optimization', desc: 'Higher delivery during active hours (6 PM – 10 PM) for realistic engagement timing.' },
              { icon: Shield, title: 'Account safety', desc: 'Randomized patterns prevent detection and keep your accounts 100% secure.' },
              { icon: Activity, title: 'Live preview', desc: 'See exactly when and how much will be delivered before placing your order.' },
              { icon: CheckCircle2, title: 'Premium quality', desc: 'High-quality engagement from real-looking accounts with complete profiles.' },
              { icon: Shuffle, title: 'Organic variance', desc: '±25% random variance on each delivery for unpredictable, natural growth.' },
            ].map((f) => (
              <div key={f.title} className="three-d-card p-6 sm:p-7">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 bg-primary/10 border border-primary/20">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-[15px] font-bold mb-2 font-display">{f.title}</h3>
                <p className="text-[13px] leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto rounded-[28px] text-center py-14 sm:py-20 px-6 sm:px-10 relative overflow-hidden glass-premium">
          <div aria-hidden className="absolute -top-32 -right-32 w-[400px] h-[400px] orb orb-mint" />
          <div aria-hidden className="absolute -bottom-32 -left-32 w-[400px] h-[400px] orb orb-bright" />

          <div className="relative">
            <Pill><Sparkles className="w-3 h-3" /> Free to start</Pill>
            <h2 className="mt-5 font-display text-[2rem] sm:text-5xl font-bold tracking-tight mb-4 text-balance">
              Ready to grow with <span className="gradient-text">Voting Pro</span>?
            </h2>
            <p className="text-[14.5px] sm:text-[16px] mb-8 max-w-md mx-auto text-muted-foreground">
              Join thousands of creators using our AI-organic delivery system. No credit card required.
            </p>
            <Link to="/auth" className="btn-3d h-12 px-8 text-[14.5px] inline-flex items-center gap-2">
              Create free account <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-white/5 py-12 px-4 sm:px-6 lg:px-8 mt-10">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/15 border border-primary/30">
                <Vote className="w-4 h-4 text-primary" />
              </div>
              <span className="font-display font-bold">Voting Pro</span>
            </div>
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              Revolutionary organic social media growth platform with natural delivery patterns.
            </p>
          </div>
          {[
            { title: 'Quick Links', links: [['Get Started', '/auth'], ['Services', '/services']] },
            { title: 'Legal', links: [['Terms of Service', '/legal/terms'], ['Privacy Policy', '/legal/privacy'], ['Refund Policy', '/legal/refund'], ['Cookie Policy', '/legal/cookies']] },
            { title: 'Support', links: [['Help Center', '/support'], ['Contact Us', '/support'], ['API Documentation', '/api-access']] },
          ].map((col) => (
            <div key={col.title}>
              <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-3">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map(([label, href]) => (
                  <li key={label}>
                    <Link to={href} className="text-[13px] text-foreground/80 hover:text-primary transition-colors">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="max-w-6xl mx-auto mt-10 pt-6 border-t border-white/5 flex items-center justify-between flex-wrap gap-3">
          <span className="text-[11.5px] text-muted-foreground">© 2026 Voting Pro. All rights reserved.</span>
          <div className="flex items-center gap-4 text-[11.5px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><Shield className="w-3 h-3 text-primary" /> SSL Secured</span>
            <span className="flex items-center gap-1.5"><Zap className="w-3 h-3 text-primary" /> 99.9% Uptime</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
