import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Check, Instagram, Youtube, Music2, Facebook, Twitter, Heart, MessageCircle, Eye, Sparkles } from 'lucide-react';
import { PageMeta } from '@/components/seo/PageMeta';
import logo from '@/assets/logo.png';

/**
 * Boostly Pro — Landing page
 * Direct visual match to user reference (RoomSketch by Phenomenon):
 *  - Deep forest-green full-bleed background
 *  - Tiny logo top-left, tiny diamond top-right
 *  - Huge centered "device" mockup (iPad-like) with a soft cream interior
 *    showing a Boostly dashboard preview with hotspots + a floating product card
 *  - "Designed by" signature bottom-right
 */

const bg = '#2A382A';          // deep forest green page bg
const bgDeep = '#1E2A1E';      // darker for device bezel
const cream = '#F3EEE3';       // warm cream device interior
const ink = '#1F1F1D';
const forest = '#2E3D2E';
const sage = '#E8E3D7';

const Index = () => {
  return (
    <div className="min-h-screen w-full antialiased relative overflow-x-hidden"
      style={{ background: bg, color: cream, fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Inter", sans-serif' }}>
      <PageMeta
        title="Boostly Pro — Premium Social Growth, Quietly Engineered"
        description="Hand-tuned organic engagement for Instagram, YouTube, TikTok and beyond. Built for creators who want quiet machinery and loud results."
        canonicalPath="/"
        breadcrumbs={[{ name: 'Home', path: '/' }]}
      />

      {/* ═══ HERO ═══ */}
      <section className="relative min-h-screen px-4 md:px-10 pt-6 pb-20 flex flex-col">
        {/* Top row: tiny logo + tiny diamond */}
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Boostly Pro" className="w-5 h-5 rounded-sm object-contain" />
            <span className="text-[14px] tracking-tight" style={{ color: cream, fontWeight: 500 }}>Boostly Pro</span>
          </Link>
          <Diamond />
        </div>

        {/* Center: device mockup */}
        <div className="flex-1 flex items-center justify-center py-10 md:py-14">
          <DeviceMockup />
        </div>

        {/* Bottom row: tiny diamond + designed-by */}
        <div className="flex items-end justify-between">
          <Diamond />
          <div className="text-right">
            <p className="text-[12px] md:text-[13px]" style={{ color: cream }}>
              Designed by <em style={{ fontFamily: '"Instrument Serif", Georgia, serif' }}>Boostly</em>
            </p>
          </div>
        </div>

        {/* Centered CTA pill (overlay, doesn't interfere with mockup) */}
        <div className="pointer-events-none absolute inset-x-0 top-6 flex justify-center">
          <Link
            to="/auth"
            className="pointer-events-auto hidden md:inline-flex items-center gap-1.5 text-[13px] px-4 py-2 rounded-full transition-transform active:scale-[0.98]"
            style={{ background: cream, color: ink }}
          >
            Get started <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* ═══ HEADLINE BELOW DEVICE ═══ */}
      <section className="px-5 md:px-10 pt-10 pb-20 md:pb-28">
        <div className="max-w-[1100px] mx-auto text-center">
          <h1 className="tracking-[-0.035em] leading-[1.02]"
            style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontSize: 'clamp(2.6rem, 7.5vw, 5.5rem)', fontWeight: 400, color: cream }}>
            Growth that looks <br className="hidden sm:block" />
            <em style={{ color: '#C9D4B6' }}>handcrafted</em>, not bought.
          </h1>
          <p className="mt-6 mx-auto max-w-[560px] text-[15px] md:text-[17px] leading-[1.65]" style={{ color: '#B8C2B5' }}>
            Boostly Pro delivers slow, organic engagement across Instagram, YouTube and TikTok — tuned by hand, paced like real fans, invisible to the algorithm.
          </p>
          <div className="mt-9 flex items-center justify-center gap-3 flex-wrap">
            <Link to="/auth" className="inline-flex items-center gap-2 px-5 h-12 rounded-full text-[14px]"
              style={{ background: cream, color: ink }}>
              Start free trial <ArrowUpRight className="w-4 h-4" />
            </Link>
            <a href="#pricing" className="inline-flex items-center gap-2 px-5 h-12 rounded-full text-[14px]"
              style={{ background: 'transparent', color: cream, border: '1px solid rgba(243,238,227,0.2)' }}>
              See pricing
            </a>
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section className="px-5 md:px-10 pb-20 md:pb-28">
        <div className="max-w-[1100px] mx-auto">
          <p className="text-[12px] mb-4" style={{ color: '#9eaa9e' }}>· The engine</p>
          <h2 className="tracking-[-0.025em] leading-[1.05] mb-12"
            style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontSize: 'clamp(2rem, 4.5vw, 3.4rem)', color: cream, fontWeight: 400 }}>
            Built slowly. <em style={{ color: '#C9D4B6' }}>Delivered quietly.</em>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { t: 'S-curve pacing', d: 'Slow ignition, viral middle, gentle taper. Mathematical, never mechanical.' },
              { t: '±50% variance', d: 'No two intervals identical. Quantity and cadence drift within human bounds.' },
              { t: 'Peak-hour weighting', d: 'Activity weighted to 6–10 PM local. Night slowdown mimics real audiences.' },
            ].map((f) => (
              <div key={f.t} className="rounded-2xl p-6"
                style={{ background: '#243324', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-5" style={{ background: '#34452F' }}>
                  <Sparkles className="w-4 h-4" style={{ color: '#C9D4B6' }} />
                </div>
                <h3 className="text-[17px] tracking-tight mb-2" style={{ color: cream, fontWeight: 500 }}>{f.t}</h3>
                <p className="text-[13.5px] leading-[1.6]" style={{ color: '#A6B0A4' }}>{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PLATFORMS ═══ */}
      <section className="px-5 md:px-10 pb-20 md:pb-28">
        <div className="max-w-[1100px] mx-auto rounded-3xl p-8 md:p-12" style={{ background: cream, color: ink }}>
          <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
            <h2 className="tracking-[-0.025em] leading-[1.05]"
              style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 400 }}>
              Every platform. <em style={{ color: forest }}>One engine.</em>
            </h2>
            <p className="text-[13px]" style={{ color: '#6b6b66' }}>Likes · Views · Followers · Comments · Shares</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { I: Instagram, n: 'Instagram' },
              { I: Youtube, n: 'YouTube' },
              { I: Music2, n: 'TikTok' },
              { I: Facebook, n: 'Facebook' },
              { I: Twitter, n: 'Twitter / X' },
            ].map(({ I, n }) => (
              <div key={n} className="rounded-2xl p-5 flex items-center gap-3"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.05)' }}>
                <I className="w-4 h-4" style={{ color: forest }} />
                <span className="text-[13.5px]" style={{ color: ink }}>{n}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section id="pricing" className="px-5 md:px-10 pb-20 md:pb-28">
        <div className="max-w-[1000px] mx-auto">
          <div className="text-center mb-12">
            <p className="text-[12px] mb-4" style={{ color: '#9eaa9e' }}>· Membership</p>
            <h2 className="tracking-[-0.025em] leading-[1.05]"
              style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontSize: 'clamp(2rem, 5vw, 3.6rem)', color: cream, fontWeight: 400 }}>
              Two quiet ways to <em style={{ color: '#C9D4B6' }}>begin.</em>
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-3xl p-7 md:p-8" style={{ background: cream, color: ink }}>
              <p className="text-[12px]" style={{ color: '#7a7a74' }}>Monthly</p>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontSize: '3rem', lineHeight: 1 }}>$20</span>
                <span className="text-[12px]" style={{ color: '#7a7a74' }}>/ month</span>
              </div>
              <ul className="mt-6 space-y-2.5">
                {['Full platform access', 'All services & platforms', 'Organic delivery engine', 'Cancel anytime'].map((t) => (
                  <li key={t} className="flex gap-2.5 text-[13.5px]" style={{ color: '#3a3a36' }}>
                    <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: forest }} /> {t}
                  </li>
                ))}
              </ul>
              <Link to="/auth" className="mt-7 flex items-center justify-center gap-2 h-11 rounded-full text-[13px]"
                style={{ background: '#F2EEE6', color: ink, border: '1px solid rgba(0,0,0,0.06)' }}>
                Start monthly <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="rounded-3xl p-7 md:p-8 relative" style={{ background: bgDeep, color: cream, border: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="absolute top-5 right-5 text-[10px] px-2.5 py-1 rounded-full"
                style={{ background: '#C9D4B6', color: bgDeep, fontWeight: 500 }}>Best value</span>
              <p className="text-[12px]" style={{ color: '#9eaa9e' }}>Lifetime</p>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontSize: '3rem', lineHeight: 1, color: cream }}>$100</span>
                <span className="text-[12px]" style={{ color: '#9eaa9e' }}>/ once</span>
              </div>
              <ul className="mt-6 space-y-2.5">
                {['Everything in monthly', 'Pay once, use forever', 'All future updates', 'Priority support'].map((t) => (
                  <li key={t} className="flex gap-2.5 text-[13.5px]" style={{ color: '#dfe5db' }}>
                    <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#C9D4B6' }} /> {t}
                  </li>
                ))}
              </ul>
              <Link to="/auth" className="mt-7 flex items-center justify-center gap-2 h-11 rounded-full text-[13px]"
                style={{ background: cream, color: bgDeep }}>
                Claim lifetime <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
          <p className="text-center mt-6 text-[12px]" style={{ color: '#9eaa9e' }}>· activation handled manually within minutes ·</p>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="px-5 md:px-10 pb-10">
        <div className="max-w-[1280px] mx-auto flex items-center justify-between flex-wrap gap-4 text-[12px]" style={{ color: '#9eaa9e' }}>
          <div className="flex items-center gap-2">
            <img src={logo} alt="" className="w-5 h-5 rounded object-contain" />
            <span style={{ color: cream, fontWeight: 500 }}>Boostly Pro</span>
            <span>· © 2026</span>
          </div>
          <div className="flex items-center gap-5">
            <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link to="/refund" className="hover:text-white transition-colors">Refund</Link>
          </div>
          <span>Designed with care</span>
        </div>
      </footer>
    </div>
  );
};

/** Diamond corner marker (matches RoomSketch reference) */
const Diamond: React.FC = () => (
  <span className="inline-block w-2 h-2 rotate-45" style={{ background: cream, opacity: 0.9 }} />
);

/** Centered iPad-like device mockup with cream interior + dashboard preview */
const DeviceMockup: React.FC = () => (
  <div className="w-full max-w-[1080px] relative">
    <div className="rounded-[28px] md:rounded-[40px] p-3 md:p-4 shadow-[0_50px_140px_-40px_rgba(0,0,0,0.55)]"
      style={{ background: bgDeep, border: '1px solid rgba(255,255,255,0.04)' }}>
      {/* device top bar */}
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#3a4a3a' }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#3a4a3a' }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#3a4a3a' }} />
        <div className="mx-auto px-4 py-1 rounded-md text-[11px]" style={{ background: '#0e180e', color: '#9aa49a' }}>
          boostly.pro / dashboard
        </div>
      </div>

      {/* screen */}
      <div className="relative rounded-[18px] md:rounded-[28px] overflow-hidden"
        style={{ background: cream, aspectRatio: '16 / 11' }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 80% at 20% 0%, #ECE6D7 0%, transparent 55%), radial-gradient(80% 60% at 100% 100%, #DDE3D6 0%, transparent 60%)' }} />

        {/* chrome */}
        <div className="absolute top-3 md:top-4 left-3 md:left-4 right-3 md:right-4 flex items-center justify-between">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full text-[10px] md:text-[11px]"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.06)', color: ink }}>
            <img src={logo} alt="" className="w-3.5 h-3.5 rounded-sm object-contain" />
            <span style={{ fontWeight: 500 }}>Boostly</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="hidden md:inline px-3 py-1.5 rounded-full text-[11px]"
              style={{ background: '#FFFFFF', color: ink, border: '1px solid rgba(0,0,0,0.06)' }}>Export</span>
            <span className="px-2.5 md:px-3 py-1.5 rounded-full text-[10px] md:text-[11px]"
              style={{ background: forest, color: cream }}>New campaign</span>
          </div>
        </div>

        {/* center post preview */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[52%] md:w-[40%] aspect-[4/5] rounded-[14px] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.25)] overflow-hidden relative"
            style={{ background: 'linear-gradient(160deg,#E2D5C1 0%, #C9B79A 40%, #8A9B7E 100%)' }}>
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-[10px]" style={{ color: ink }}>
              <div className="flex items-center gap-1.5">
                <Instagram className="w-3 h-3" />
                <span>@your.brand</span>
              </div>
              <span>2h</span>
            </div>
            <div className="absolute bottom-3 left-3 right-3 flex items-center gap-3 text-[11px]" style={{ color: ink }}>
              <span className="flex items-center gap-1"><Heart className="w-3 h-3 fill-current" />12.4K</span>
              <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />286</span>
              <span className="flex items-center gap-1"><Eye className="w-3 h-3" />84K</span>
            </div>
          </div>
        </div>

        {/* hotspots */}
        <Hotspot top="30%" left="22%" />
        <Hotspot top="62%" left="80%" />
        <Hotspot top="78%" left="44%" />

        {/* floating product-style annotation card */}
        <div className="absolute left-3 md:left-6 bottom-3 md:bottom-6 w-[88%] md:w-[340px] rounded-2xl p-3 md:p-4 shadow-[0_18px_50px_-18px_rgba(0,0,0,0.22)]"
          style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.05)' }}>
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-lg shrink-0 flex items-center justify-center" style={{ background: sage }}>
              <Sparkles className="w-5 h-5" style={{ color: forest }} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px]" style={{ color: '#7a7a74' }}>
                <span>Organic Engine</span><span>·</span>
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

        {/* compare chip */}
        <div className="hidden md:flex absolute right-6 bottom-6 items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px]"
          style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.06)', color: ink }}>
          Compare runs
        </div>
      </div>
    </div>
  </div>
);

const Hotspot: React.FC<{ top: string; left: string }> = ({ top, left }) => (
  <div className="absolute" style={{ top, left, transform: 'translate(-50%, -50%)' }}>
    <span className="relative flex h-4 w-4 items-center justify-center">
      <span className="absolute inline-flex h-full w-full rounded-full opacity-50 animate-ping" style={{ background: '#FFFFFF' }} />
      <span className="relative inline-flex h-4 w-4 rounded-full items-center justify-center"
        style={{ background: '#FFFFFF', border: '2px solid #1B2A1B' }}>
        <span className="block w-1.5 h-1.5 rounded-full" style={{ background: '#1B2A1B' }} />
      </span>
    </span>
  </div>
);

export default Index;
