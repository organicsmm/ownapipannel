import { useState, lazy, Suspense } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { KeyRound, Boxes, Sparkles, ArrowRight, Lock, CheckCircle2 } from 'lucide-react';

const SubscriptionCheckDialog = lazy(() =>
  import('./SubscriptionCheckDialog').then((m) => ({ default: m.SubscriptionCheckDialog }))
);

/**
 * Premium upgrade CTA rendered on the Dashboard for users without an active
 * subscription. Nudges them to subscribe to unlock Providers & Bundles.
 */
export function UnlockProCard() {
  const { isAdmin } = useAuth();
  const { hasActiveSubscription, hasPendingRequest, isLoading } = useSubscription();
  const [open, setOpen] = useState(false);

  if (isLoading || isAdmin || hasActiveSubscription) return null;

  return (
    <>
      <div className="relative overflow-hidden rounded-md border border-primary/30 bg-gradient-to-br from-card via-card to-primary/5">
        {/* glow accents */}
        <div className="pointer-events-none absolute -top-24 -right-16 w-64 h-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 w-64 h-64 rounded-full bg-amber-500/10 blur-3xl" />

        <div className="relative p-5 sm:p-7 grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          {/* LEFT — pitch */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.2em] text-primary">
                <Lock className="w-3 h-3" /> pro locked
              </span>
              {hasPendingRequest && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.2em] text-amber-500">
                  request pending
                </span>
              )}
            </div>

            <h2 className="font-serif text-2xl sm:text-[28px] leading-[1.1] tracking-tight text-foreground">
              Unlock Providers & Bundles<span className="text-primary italic">.</span>
            </h2>
            <p className="text-[13px] sm:text-sm text-muted-foreground mt-2 max-w-lg">
              Subscribe to add your own API providers, build custom bundles and
              run mass engagement orders — all on autopilot.
            </p>

            <ul className="mt-4 grid sm:grid-cols-2 gap-2">
              {[
                'Add unlimited API providers',
                'Create custom service bundles',
                'Mass orders & full engagement',
                'Priority support & AI intelligence',
              ].map((f) => (
                <li key={f} className="flex items-center gap-2 text-[12.5px] text-foreground/90">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                onClick={() => setOpen(true)}
                disabled={hasPendingRequest}
                className="group h-11 px-5 rounded-md bg-primary text-primary-foreground font-mono text-[11px] uppercase tracking-[0.18em] flex items-center gap-2 hover:shadow-[0_15px_40px_-15px_hsl(var(--primary)/0.7)] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {hasPendingRequest ? 'awaiting approval' : 'unlock pro'}
                {!hasPendingRequest && (
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                )}
              </button>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                :from $39/mo · $249/yr · $499 lifetime
              </p>
            </div>
          </div>

          {/* RIGHT — locked feature preview */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: KeyRound, label: 'My Providers', sub: 'Add your own API keys' },
              { icon: Boxes, label: 'My Bundles', sub: 'Build service combos' },
            ].map((f) => (
              <div
                key={f.label}
                className="relative rounded-md border border-border bg-background/60 backdrop-blur p-4 overflow-hidden"
              >
                <div className="absolute top-2 right-2">
                  <Lock className="w-3 h-3 text-muted-foreground/60" />
                </div>
                <div className="w-9 h-9 rounded-md border border-primary/30 bg-primary/5 flex items-center justify-center text-primary mb-3">
                  <f.icon className="w-4 h-4" />
                </div>
                <p className="text-[13px] font-semibold text-foreground">{f.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{f.sub}</p>
                <span className="mt-3 inline-block font-mono text-[8px] tracking-[0.18em] px-1.5 py-0.5 rounded-sm border border-primary/30 text-primary">
                  PRO
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {open && (
        <Suspense fallback={null}>
          <SubscriptionCheckDialog open={open} onOpenChange={setOpen} />
        </Suspense>
      )}
    </>
  );
}
