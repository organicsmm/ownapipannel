import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowRight, Check, Instagram, Youtube, Music2, Facebook, Twitter, Heart, MessageCircle, Eye, UserPlus, Sparkles } from 'lucide-react';
import { PageMeta } from '@/components/seo/PageMeta';
import logo from '@/assets/logo.png';

/**
 * Boostly Pro — Landing page
 * Aesthetic: RoomSketch-inspired warm editorial.
 * Cream paper background, deep forest-green accents, soft serif headlines,
 * a hero "device" mockup with floating annotation cards (hotspots),
 * and a quiet, hand-crafted founder feel.
 *
 * Colors are intentionally scoped locally so other pages keep the orange theme.
 */

const cream = '#F5F1EA';
const ink = '#1F1F1D';
const forest = '#2E3D2E';
const forestDark = '#1B2A1B';
const sage = '#E8E3D7';

const Index = () => {
  return (
    <div className="min-h-screen w-full antialiased" style={{ background: cream, color: ink, fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Inter", sans-serif' }}>
      <PageMeta
        title="Boostly Pro — Premium Social Growth, Quietly Engineered"
        description="Hand-tuned organic engagement for Instagram, YouTube, TikTok and beyond. Built for creators who want quiet machinery and loud results."
        canonicalPath="/"
        breadcrumbs={[{ name: 'Home', path: '/' }]}
      />

      {/* ═══ NAV ═══ */}
      <header className="px-5 md:px-10 pt-6 md:pt-8">
        <nav className="max-w-[1280px] mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logo} alt="Boostly Pro" className="w-7 h-7 rounded-md object-contain" />
            <span className="text-[17px] tracking-tight" style={{ color: ink, fontWeight: 500 }}>Boostly Pro</span>
          </Link>

          <div className="hidden md:flex items-center gap-7 text-[13px]" style={{ color: '#5B5B57' }}>
            <a href="#features" className="hover:text-black transition-colors">Features</a>
            <a href="#platforms" className="hover:text-black transition-colors">Platforms</a>
            <a href="#pricing" className="hover:text-black transition-colors">Pricing</a>
            <a href="#story" className="hover:text-black transition-colors">Story</a>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/auth" className="hidden sm:inline-flex items-center text-[13px] px-3.5 py-2 rounded-full" style={{ background: '#FFFFFF', color: ink, border: '1px solid rgba(0,0,0,0.06)' }}>
              Sign in
            </Link>
            <Link to="/auth" className="inline-flex items-center gap-1.5 text-[13px] px-4 py-2 rounded-full transition-transform active:scale-[0.98]" style={{ background: forest, color: cream }}>
              Get started <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </nav>
      </header>

      {/* ═══ HERO ═══ */}
      <section className="px-5 md:px-10 pt-14 md:pt-24 pb-10 md:pb-16">
        <div className="max-w-[1100px] mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px]" style={{ background: '#FFFFFF', color: '#4A4A46', border: '1px solid rgba(0,0,0,0.06)' }}>
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping" style={{ background: forest }} />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: forest }} />
            </span>
            2,400+ creators growing this week
          </div>

          <h1 className="mt-7 tracking-[-0.035em] leading-[1.02]" style={{ fontFamily: '"Instrument Serif", "Cormorant Garamond", Georgia, serif', fontSize: 'clamp(2.6rem, 7.5vw, 5.5rem)', fontWeight: 400, color: ink }}>
            Growth that looks <br className="hidden sm:block" />
            <em style={{ color: forest }}>handcrafted</em>, not bought.
          </h1>

          <p className="mt-6 mx-auto max-w-[560px] text-[15px] md:text-[17px] leading-[1.6]" style={{ color: '#55554F' }}>
            Boostly Pro delivers slow, organic engagement across Instagram, YouTube and TikTok — tuned by hand, paced like real fans, invisible to the algorithm.
          </p>

          <div className="mt-9 flex items-center justify-center gap-3 flex-wrap">
            <Link to="/auth" className="inline-flex items-center gap-2 px-5 h-12 rounded-full text-[14px] transition-transform active:scale-[0.98]" style={{ background: forest, color: cream }}>
              Start free trial <ArrowUpRight className="w-4 h-4" />
            </Link>
            <a href="#features" className="inline-flex items-center gap-2 px-5 h-12 rounded-full text-[14px]" style={{ background: '#FFFFFF', color: ink, border: '1px solid rgba(0,0,0,0.08)' }}>
              See how it works
            </a>
          </div>
        </div>

        {/* Hero showcase device */}
        <div className="mt-14 md:mt-20 max-w-[1180px] mx-auto">
          <div className="relative rounded-[28px] md:rounded-[36px] p-3 md:p-4 shadow-[0_40px_120px_-40px_rgba(31,31,29,0.35)]" style={{ background: forestDark }}>
            {/* fake browser bar */}
            <div className="flex items-center gap-2 px-3 py-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#3a4a3a' }} />
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#3a4a3a' }} />
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#3a4a3a' }} />
              <div className="mx-auto px-4 py-1 rounded-md text-[11px]" style={{ background: '#0e180e', color: '#9aa49a' }}>boostly.pro / dashboard</div>
            </div>

            <div className="relative rounded-[20px] md:rounded-[24px] overflow-hidden" style={{ background: cream, aspectRatio: '16 / 10' }}>
              {/* Soft background gradient */}
              <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 80% at 20% 0%, #ECE6D7 0%, transparent 55%), radial-gradient(80% 60% at 100% 100%, #DDE3D6 0%, transparent 60%)' }} />

              {/* Dashboard chrome */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px]" style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.06)' }}>
                  <img src={logo} alt="" className="w-4 h-4 rounded-sm object-contain" />
                  <span style={{ color: ink, fontWeight: 500 }}>Boostly</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="hidden md:inline px-3 py-1.5 rounded-full text-[11px]" style={{ background: '#FFFFFF', color: ink, border: '1px solid rgba(0,0,0,0.06)' }}>Export</span>
                  <span className="px-3 py-1.5 rounded-full text-[11px]" style={{ background: forest, color: cream }}>New campaign</span>
                </div>
              </div>

              {/* Center "post" card preview */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-[58%] md:w-[44%] aspect-[4/5] rounded-[14px] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.25)] overflow-hidden relative" style={{ background: 'linear-gradient(160deg,#E2D5C1 0%, #C9B79A 40%, #8A9B7E 100%)' }}>
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-[10px]" style={{ color: '#1f1f1d' }}>
                    <div className="flex items-center gap-1.5">
                      <Instagram className="w-3 h-3" />
                      <span>@your.brand</span>
                    </div>
                    <span>2h</span>
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 flex items-center gap-3 text-[11px]" style={{ color: '#1f1f1d' }}>
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3 fill-current" />12.4K</span>
                    <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />286</span>
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" />84K</span>
                  </div>
                </div>
              </div>

              {/* Hotspots */}
              <Hotspot top="32%" left="22%" />
              <Hotspot top="58%" left="78%" />
              <Hotspot top="74%" left="40%" />

              {/* Floating product-style card */}
              <div className="absolute left-3 md:left-6 bottom-3 md:bottom-6 w-[88%] md:w-[340px] rounded-2xl p-3 md:p-4 shadow-[0_18px_50px_-18px_rgba(0,0,0,0.22)]" style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.05)' }}>
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-lg shrink-0 flex items-center justify-center" style={{ background: sage }}>
                    <Sparkles className="w-5 h-5" style={{ color: forest }} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-[11px]" style={{ color: '#7a7a74' }}>
                      <span>Organic Engine</span>
                      <span>·</span>
                      <span style={{ color: forest, fontWeight: 500 }}>live</span>
                    </div>
                    <p className="text-[13px] mt-0.5" style={{ color: ink, fontWeight: 500 }}>Drip · 500 likes / 1h · ±25% variance</p>
                    <p className="text-[11.5px] mt-1 leading-[1.5]" style={{ color: '#6b6b66' }}>
                      Paced to 6–10 PM IST. Night slowdown on. Reads like real fans, not a bot.
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button className="flex-1 h-8 rounded-md text-[11.5px]" style={{ background: '#F2EEE6', color: ink }}>Pause</button>
                  <button className="flex-1 h-8 rounded-md text-[11.5px]" style={{ background: forest, color: cream }}>Open campaign</button>
                </div>
              </div>

              {/* Compare images chip */}
              <div className="hidden md:flex absolute right-6 bottom-6 items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px]" style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.06)', color: ink }}>
                Compare runs
              </div>
            </div>
          </div>

          {/* Trust strip */}
          <div className="mt-8 flex items-center justify-center gap-6 md:gap-10 flex-wrap text-[12px]" style={{ color: '#6f6f69' }}>
            <span className="flex items-center gap-2"><Check className="w-3.5 h-3.5" style={{ color: forest }} /> Zero bans across 50k+ orders</span>
            <span className="flex items-center gap-2"><Check className="w-3.5 h-3.5" style={{ color: forest }} /> Manual activation in minutes</span>
            <span className="flex items-center gap-2"><Check className="w-3.5 h-3.5" style={{ color: forest }} /> Cancel anytime</span>
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section id="features" className="px-5 md:px-10 py-20 md:py-28">
        <div className="max-w-[1100px] mx-auto">
          <div className="grid md:grid-cols-12 gap-8 md:gap-12 mb-12 md:mb-16">
            <div className="md:col-span-7">
              <p className="text-[12px] mb-4" style={{ color: forest }}>· The engine</p>
              <h2 className="tracking-[-0.025em] leading-[1.05]" style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontSize: 'clamp(2rem, 4.5vw, 3.4rem)', color: ink, fontWeight: 400 }}>
                Built slowly. <em style={{ color: forest }}>Delivered quietly.</em>
              </h2>
            </div>
            <div className="md:col-span-5 md:pt-6">
              <p className="text-[15px] leading-[1.65]" style={{ color: '#5B5B57' }}>
                Every order is paced against thousands of invisible signals — peak hours, organic variance, dwell, regional drift. It reads as life, never as labor.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { t: 'S-curve pacing', d: 'Slow ignition, viral middle, gentle taper. Mathematical, never mechanical.' },
              { t: '±50% variance', d: 'No two intervals identical. Quantity and cadence drift within human bounds.' },
              { t: 'Peak-hour weighting', d: 'Activity weighted to 6–10 PM local. Night slowdown mimics real audiences.' },
            ].map((f) => (
              <div key={f.t} className="rounded-2xl p-6" style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.05)' }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-5" style={{ background: sage }}>
                  <Sparkles className="w-4 h-4" style={{ color: forest }} />
                </div>
                <h3 className="text-[17px] tracking-tight mb-2" style={{ color: ink, fontWeight: 500 }}>{f.t}</h3>
                <p className="text-[13.5px] leading-[1.6]" style={{ color: '#6b6b66' }}>{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PLATFORMS ═══ */}
      <section id="platforms" className="px-5 md:px-10 py-16 md:py-20">
        <div className="max-w-[1100px] mx-auto rounded-3xl p-8 md:p-12" style={{ background: forestDark, color: cream }}>
          <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
            <h2 className="tracking-[-0.025em] leading-[1.05]" style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 400 }}>
              Every platform. <em style={{ color: '#C9D4B6' }}>One engine.</em>
            </h2>
            <p className="text-[13px]" style={{ color: '#9eaa9e' }}>Likes · Views · Followers · Comments · Shares</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { I: Instagram, n: 'Instagram' },
              { I: Youtube, n: 'YouTube' },
              { I: Music2, n: 'TikTok' },
              { I: Facebook, n: 'Facebook' },
              { I: Twitter, n: 'Twitter / X' },
            ].map(({ I, n }) => (
              <div key={n} className="rounded-2xl p-5 flex items-center gap-3" style={{ background: '#243324', border: '1px solid rgba(255,255,255,0.05)' }}>
                <I className="w-4 h-4" style={{ color: '#C9D4B6' }} />
                <span className="text-[13.5px]" style={{ color: cream }}>{n}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section id="pricing" className="px-5 md:px-10 py-20 md:py-28">
        <div className="max-w-[1000px] mx-auto">
          <div className="text-center mb-12">
            <p className="text-[12px] mb-4" style={{ color: forest }}>· Membership</p>
            <h2 className="tracking-[-0.025em] leading-[1.05]" style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontSize: 'clamp(2rem, 5vw, 3.6rem)', color: ink, fontWeight: 400 }}>
              Two quiet ways to <em style={{ color: forest }}>begin.</em>
            </h2>
            <p className="mt-4 max-w-md mx-auto text-[14.5px]" style={{ color: '#5B5B57' }}>
              Single membership, full access. No tiers, no upsells, no hidden gates.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Monthly */}
            <div className="rounded-3xl p-7 md:p-8" style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.06)' }}>
              <p className="text-[12px]" style={{ color: '#7a7a74' }}>Monthly</p>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontSize: '3rem', color: ink, lineHeight: 1 }}>$20</span>
                <span className="text-[12px]" style={{ color: '#7a7a74' }}>/ month</span>
              </div>
              <p className="mt-2 text-[13px]" style={{ color: '#6b6b66' }}>For creators testing the waters.</p>
              <ul className="mt-6 space-y-2.5">
                {['Full platform access', 'All services & platforms', 'Organic delivery engine', 'Cancel anytime'].map((t) => (
                  <li key={t} className="flex gap-2.5 text-[13.5px]" style={{ color: '#3a3a36' }}>
                    <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: forest }} /> {t}
                  </li>
                ))}
              </ul>
              <Link to="/auth" className="mt-7 flex items-center justify-center gap-2 h-11 rounded-full text-[13px]" style={{ background: '#F2EEE6', color: ink }}>
                Start monthly <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Lifetime */}
            <div className="rounded-3xl p-7 md:p-8 relative" style={{ background: forestDark, color: cream }}>
              <span className="absolute top-5 right-5 text-[10px] px-2.5 py-1 rounded-full" style={{ background: '#C9D4B6', color: forestDark, fontWeight: 500 }}>
                Best value
              </span>
              <p className="text-[12px]" style={{ color: '#9eaa9e' }}>Lifetime</p>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontSize: '3rem', lineHeight: 1, color: cream }}>$100</span>
                <span className="text-[12px]" style={{ color: '#9eaa9e' }}>/ once</span>
              </div>
              <p className="mt-2 text-[13px]" style={{ color: '#b9c2b9' }}>One payment. Forever.</p>
              <ul className="mt-6 space-y-2.5">
                {['Everything in monthly', 'Pay once, use forever', 'All future updates', 'Priority support'].map((t) => (
                  <li key={t} className="flex gap-2.5 text-[13.5px]" style={{ color: '#dfe5db' }}>
                    <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#C9D4B6' }} /> {t}
                  </li>
                ))}
              </ul>
              <Link to="/auth" className="mt-7 flex items-center justify-center gap-2 h-11 rounded-full text-[13px]" style={{ background: cream, color: forestDark }}>
                Claim lifetime <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <p className="text-center mt-6 text-[12px]" style={{ color: '#7a7a74' }}>· activation handled manually within minutes ·</p>
        </div>
      </section>

      {/* ═══ FOUNDER NOTE ═══ */}
      <section id="story" className="px-5 md:px-10 py-20 md:py-28">
        <div className="max-w-[820px] mx-auto rounded-3xl p-8 md:p-14" style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.05)' }}>
          <p style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontSize: 'clamp(1.35rem, 2.6vw, 1.9rem)', lineHeight: 1.4, color: ink, fontWeight: 400 }}>
            “I built Boostly Pro after watching creator after creator get burned by panels that promise growth and deliver bans. Every line of this exists to do one thing — make algorithms feel safe with you. <em style={{ color: forest }}>Quiet. Patient. Human.</em>”
          </p>
          <div className="mt-8 flex items-center gap-3">
            <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: sage, color: forest, fontFamily: '"Instrument Serif", serif', fontSize: 18 }}>A</div>
            <div>
              <p className="text-[13.5px]" style={{ color: ink, fontWeight: 500 }}>Abhishek</p>
              <p className="text-[11.5px]" style={{ color: '#7a7a74' }}>Founder · building Boostly since 2024</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="px-5 md:px-10 pb-20">
        <div className="max-w-[1100px] mx-auto rounded-3xl p-10 md:p-16 text-center" style={{ background: sage }}>
          <h2 className="tracking-[-0.03em] leading-[1.02]" style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontSize: 'clamp(2.2rem, 6vw, 4.5rem)', color: ink, fontWeight: 400 }}>
            Quiet power. <em style={{ color: forest }}>Loud results.</em>
          </h2>
          <p className="mt-5 text-[14.5px]" style={{ color: '#55554F' }}>Start free. No card. Full access.</p>
          <Link to="/auth" className="mt-8 inline-flex items-center gap-2 px-6 h-12 rounded-full text-[14px]" style={{ background: forest, color: cream }}>
            Begin with Boostly Pro <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="px-5 md:px-10 pb-10">
        <div className="max-w-[1280px] mx-auto flex items-center justify-between flex-wrap gap-4 text-[12px]" style={{ color: '#7a7a74' }}>
          <div className="flex items-center gap-2">
            <img src={logo} alt="" className="w-5 h-5 rounded object-contain" />
            <span style={{ color: ink, fontWeight: 500 }}>Boostly Pro</span>
            <span>· © 2026</span>
          </div>
          <div className="flex items-center gap-5">
            <Link to="/terms" className="hover:text-black transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-black transition-colors">Privacy</Link>
            <Link to="/refund" className="hover:text-black transition-colors">Refund</Link>
          </div>
          <span>Designed with care · by Abhishek</span>
        </div>
      </footer>
    </div>
  );
};

/** Small circular hotspot used inside the hero device, RoomSketch-style */
const Hotspot: React.FC<{ top: string; left: string }> = ({ top, left }) => (
  <div className="absolute" style={{ top, left, transform: 'translate(-50%, -50%)' }}>
    <span className="relative flex h-4 w-4 items-center justify-center">
      <span className="absolute inline-flex h-full w-full rounded-full opacity-50 animate-ping" style={{ background: '#FFFFFF' }} />
      <span className="relative inline-flex h-4 w-4 rounded-full items-center justify-center" style={{ background: '#FFFFFF', border: '2px solid #1B2A1B' }}>
        <span className="block w-1.5 h-1.5 rounded-full" style={{ background: '#1B2A1B' }} />
      </span>
    </span>
  </div>
);

export default Index;
