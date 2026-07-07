import { useState, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageMeta } from '@/components/seo/PageMeta';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Lock,
  Sparkles,
  ArrowRight,
  KeyRound,
  Boxes,
  CheckCircle2,
  Info,
  Plus,
  Zap,
  ShieldCheck,
  LayoutGrid,
} from 'lucide-react';

const SubscriptionCheckDialog = lazy(() =>
  import('./SubscriptionCheckDialog').then((m) => ({ default: m.SubscriptionCheckDialog }))
);

type FeatureKey = 'providers' | 'bundles';

interface Props {
  feature: FeatureKey;
  children: React.ReactNode;
}

const COPY: Record<
  FeatureKey,
  {
    title: string;
    eyebrow: string;
    description: string;
    unlocks: { icon: any; label: string; tooltip: string }[];
    mockup: React.ReactNode;
  }
> = {
  providers: {
    eyebrow: ':pro_locked',
    title: 'My Providers',
    description:
      'Connect your own SMM API providers, rotate keys across services, and route every order through the endpoint you trust.',
    unlocks: [
      {
        icon: KeyRound,
        label: 'Add unlimited API keys',
        tooltip:
          'Plug in as many provider accounts as you need. Each key is encrypted and only used for orders you place.',
      },
      {
        icon: LayoutGrid,
        label: 'Map services to providers',
        tooltip:
          'Choose exactly which provider fulfils each service — Instagram views, TikTok likes, YouTube watch time — all under your control.',
      },
      {
        icon: Zap,
        label: 'Auto-rotate on failure',
        tooltip:
          'If one provider is slow or out of balance, the system automatically switches to the next healthy one so orders never stall.',
      },
      {
        icon: ShieldCheck,
        label: 'Priority order routing',
        tooltip:
          'Pro users get first pick of provider capacity — your orders skip the shared queue.',
      },
    ],
    mockup: <ProvidersMockup />,
  },
  bundles: {
    eyebrow: ':pro_locked',
    title: 'My Bundles',
    description:
      'Build custom service combos — likes + views + comments in one click — then reuse them for every campaign.',
    unlocks: [
      {
        icon: Boxes,
        label: 'Create custom bundles',
        tooltip:
          'Combine any of your services into a single named bundle so clients can order everything with one tap.',
      },
      {
        icon: Sparkles,
        label: 'Price them your way',
        tooltip:
          'Set your own margins per bundle and per service inside it. Discount high-volume packages or premium up small ones.',
      },
      {
        icon: Zap,
        label: 'Reuse across mass orders',
        tooltip:
          'Every bundle plugs straight into the Mass Order tool — spread thousands of links across dozens of services in seconds.',
      },
      {
        icon: ShieldCheck,
        label: 'Private to your account',
        tooltip:
          'Your bundles are never shared with other users. Full ownership, full control.',
      },
    ],
    mockup: <BundlesMockup />,
  },
};

export function LockedFeaturePreview({ feature, children }: Props) {
  const { isAdmin } = useAuth();
  const { hasActiveSubscription, hasPendingRequest, isLoading } = useSubscription();
  const [open, setOpen] = useState(false);

  if (isLoading) return <>{children}</>;
  if (isAdmin || hasActiveSubscription) return <>{children}</>;

  const copy = COPY[feature];

  return (
    <DashboardLayout>
      <PageMeta title={`${copy.title} — Locked`} description={copy.description} noIndex />
      <TooltipProvider delayDuration={150}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-b border-border pb-5">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary mb-2 flex items-center gap-1.5">
                <Lock className="w-3 h-3" /> {copy.eyebrow}
              </p>
              <h1 className="font-serif text-3xl sm:text-4xl leading-[1] tracking-tight text-foreground">
                {copy.title}
                <span className="text-primary italic">.</span>
              </h1>
              <p className="text-[13px] sm:text-sm text-muted-foreground mt-2 max-w-xl">
                {copy.description}
              </p>
            </div>
            <button
              onClick={() => setOpen(true)}
              disabled={hasPendingRequest}
              className="group h-11 px-5 rounded-md bg-primary text-primary-foreground font-mono text-[11px] uppercase tracking-[0.18em] flex items-center gap-2 hover:shadow-[0_15px_40px_-15px_hsl(var(--primary)/0.7)] transition-all disabled:opacity-60 disabled:cursor-not-allowed self-start sm:self-auto"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {hasPendingRequest ? 'awaiting approval' : 'unlock pro'}
              {!hasPendingRequest && (
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              )}
            </button>
          </div>

          {/* What you unlock — tooltips */}
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-3 flex items-center gap-1.5">
              :what_you_unlock <Info className="w-3 h-3" />
              <span className="text-[9px] normal-case tracking-normal text-muted-foreground/70">
                (hover any item for details)
              </span>
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {copy.unlocks.map((u) => (
                <Tooltip key={u.label}>
                  <TooltipTrigger asChild>
                    <div className="group flex items-start gap-3 p-4 rounded-md border border-border bg-card hover:border-primary/40 transition-colors cursor-help">
                      <div className="w-9 h-9 rounded-md border border-primary/30 bg-primary/5 flex items-center justify-center text-primary shrink-0">
                        <u.icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-semibold text-foreground">{u.label}</p>
                          <Info className="w-3 h-3 text-muted-foreground/60 group-hover:text-primary transition-colors" />
                        </div>
                        <p className="text-[11.5px] text-muted-foreground mt-0.5 line-clamp-1">
                          {u.tooltip}
                        </p>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-primary/70 shrink-0 mt-1" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="max-w-xs bg-popover border border-border text-foreground"
                  >
                    <p className="text-[12px] leading-snug">{u.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>

          {/* Locked preview mockup */}
          <div className="relative rounded-md border border-border overflow-hidden">
            <p className="px-5 py-3 border-b border-border font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2">
              <Lock className="w-3 h-3" /> :locked_preview — this is what
              you&rsquo;ll see after upgrading
            </p>

            <div className="relative">
              {/* Blurred mock */}
              <div
                className="pointer-events-none select-none blur-[3px] opacity-70"
                aria-hidden
              >
                {copy.mockup}
              </div>

              {/* Overlay CTA */}
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-background/40 via-background/70 to-background/90 backdrop-blur-[2px]">
                <div className="text-center px-6 py-8 rounded-md border border-primary/30 bg-card/95 shadow-2xl max-w-sm">
                  <div className="w-12 h-12 rounded-full border border-primary/40 bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Lock className="w-5 h-5 text-primary" />
                  </div>
                  <p className="font-serif text-lg text-foreground mb-1">
                    Subscribe to unlock {copy.title}
                  </p>
                  <p className="text-[12px] text-muted-foreground mb-4">
                    Plans start at <span className="text-foreground font-medium">$1/month</span> ·
                    yearly $249 · lifetime $499
                  </p>
                  <button
                    onClick={() => setOpen(true)}
                    disabled={hasPendingRequest}
                    className="w-full h-10 px-4 rounded-md bg-primary text-primary-foreground font-mono text-[11px] uppercase tracking-[0.18em] flex items-center justify-center gap-2 hover:shadow-[0_15px_40px_-15px_hsl(var(--primary)/0.7)] transition-all disabled:opacity-60"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {hasPendingRequest ? 'awaiting approval' : 'unlock now'}
                  </button>
                  <Link
                    to="/dashboard"
                    className="block mt-3 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    ← back to dashboard
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </TooltipProvider>

      {open && (
        <Suspense fallback={null}>
          <SubscriptionCheckDialog open={open} onOpenChange={setOpen} />
        </Suspense>
      )}
    </DashboardLayout>
  );
}

/* ---------- Static mock UIs (blurred underneath overlay) ---------- */

function ProvidersMockup() {
  return (
    <div className="p-5 space-y-3 bg-background">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          :connected_providers
        </p>
        <div className="h-8 px-3 rounded-md bg-primary/20 border border-primary/30 flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.15em] text-primary">
          <Plus className="w-3 h-3" /> add provider
        </div>
      </div>
      {[
        { name: 'SMMHeaven API', status: 'active', balance: '$142.30', svc: '128 services' },
        { name: 'JustAnotherPanel', status: 'active', balance: '$56.10', svc: '84 services' },
        { name: 'PeakSMM', status: 'paused', balance: '$0.00', svc: '212 services' },
      ].map((p) => (
        <div
          key={p.name}
          className="flex items-center justify-between p-4 rounded-md border border-border bg-card"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md border border-border bg-background flex items-center justify-center text-primary">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-foreground">{p.name}</p>
              <p className="text-[11px] text-muted-foreground">{p.svc}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[13px] font-mono text-foreground">{p.balance}</p>
            <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-primary">
              {p.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function BundlesMockup() {
  return (
    <div className="p-5 space-y-3 bg-background">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          :my_bundles
        </p>
        <div className="h-8 px-3 rounded-md bg-primary/20 border border-primary/30 flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.15em] text-primary">
          <Plus className="w-3 h-3" /> new bundle
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {[
          { name: 'Instagram Reel Boost', items: 3, price: '$12.40' },
          { name: 'TikTok Viral Combo', items: 4, price: '$18.90' },
          { name: 'YouTube Launch Pack', items: 5, price: '$34.00' },
          { name: 'Twitter Engagement', items: 3, price: '$9.20' },
        ].map((b) => (
          <div key={b.name} className="p-4 rounded-md border border-border bg-card">
            <div className="w-9 h-9 rounded-md border border-border bg-background flex items-center justify-center text-primary mb-3">
              <Boxes className="w-4 h-4" />
            </div>
            <p className="text-[13px] font-semibold text-foreground">{b.name}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{b.items} services bundled</p>
            <p className="text-[14px] font-mono text-primary mt-2">{b.price}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
