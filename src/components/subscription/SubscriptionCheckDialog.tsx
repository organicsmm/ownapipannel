import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Lock, Bitcoin, Check, Loader2, Sparkles, Crown } from 'lucide-react';

interface SubscriptionCheckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Plan = 'monthly' | 'yearly' | 'lifetime';

type PlanMeta = {
  label: string;
  price: number;
  suffix: string;
  features: string[];
  badge?: string;
};

const PLAN_META: Record<Plan, PlanMeta> = {
  monthly:  { label: 'Monthly',  price: 29,  suffix: '/mo',      features: ['30 days access', 'Full platform', 'Cancel anytime'] },
  yearly:   { label: 'Yearly',   price: 249, suffix: '/year',    features: ['365 days access', 'Save vs monthly', 'All features unlocked'], badge: 'Most Popular' },
  lifetime: { label: 'Lifetime', price: 499, suffix: 'one-time', features: ['Forever access', 'All future updates', 'Best value'], badge: 'Best' },
};

export function SubscriptionCheckDialog({ open, onOpenChange }: SubscriptionCheckDialogProps) {
  const [selectedPlan, setSelectedPlan] = useState<Plan>('yearly');
  const [paying, setPaying] = useState(false);

  const payWithCrypto = async () => {
    try {
      setPaying(true);
      const { data, error } = await supabase.functions.invoke(
        'oxapay-create-subscription',
        { body: { plan: selectedPlan } }
      );
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      const url = (data as any)?.payment_url;
      if (!url) throw new Error('No payment URL returned');
      window.location.href = url;
    } catch (e: any) {
      toast.error(e?.message || 'Failed to start crypto payment');
      setPaying(false);
    }
  };

  const selectedPrice = PLAN_META[selectedPlan].price;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0 border border-border bg-card rounded-2xl overflow-hidden">
        {/* Soft light glow accents */}
        <div className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 bg-primary/15 blur-[120px] rounded-full" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 w-96 h-96 bg-primary/10 blur-[120px] rounded-full" />

        <div className="relative px-5 sm:px-8 pt-8 sm:pt-10 pb-8 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="text-center items-center space-y-3 mb-8 sm:mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] sm:text-xs font-semibold tracking-wider uppercase text-primary">
              <Lock className="w-3.5 h-3.5" />
              Secure Checkout
            </div>
            <DialogTitle className="font-serif text-3xl sm:text-4xl tracking-tight text-foreground">
              Choose Your Plan<span className="text-primary italic">.</span>
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Pay with BTC, USDT, ETH, or LTC. Instant on-chain verification.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 mb-10 md:pt-4">
            {(Object.keys(PLAN_META) as Plan[]).map((plan) => {
              const meta = PLAN_META[plan];
              const selected = selectedPlan === plan;
              const isBest = plan === 'lifetime';

              return (
                <button
                  key={plan}
                  type="button"
                  onClick={() => setSelectedPlan(plan)}
                  className={`group relative text-left p-5 sm:p-6 rounded-2xl border-2 bg-background transition-all duration-300 ${
                    selected
                      ? 'border-primary bg-primary/5 shadow-[0_15px_40px_-15px_hsl(var(--primary)/0.4)] md:scale-[1.03] z-10'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  {meta.badge && (
                    <div
                      className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight whitespace-nowrap flex items-center gap-1 ${
                        isBest
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                          : 'bg-primary text-primary-foreground'
                      }`}
                    >
                      {isBest && <Sparkles className="w-3 h-3" />}
                      {meta.badge}
                    </div>
                  )}

                  <div className="mb-5 sm:mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      {isBest ? (
                        <Crown className="w-4 h-4 text-amber-500" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-primary" />
                      )}
                      <p className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground">
                        {meta.label}
                      </p>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                        ${meta.price}
                      </span>
                      <span className="text-sm text-muted-foreground">{meta.suffix}</span>
                    </div>

                  </div>

                  <ul className="space-y-3 sm:space-y-4">
                    {meta.features.map((f) => (
                      <li
                        key={f}
                        className="flex items-center gap-3 text-sm text-foreground/90"
                      >
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                            selected ? 'bg-primary' : 'bg-primary/10'
                          }`}
                        >
                          <Check
                            className={`w-3 h-3 ${selected ? 'text-primary-foreground' : 'text-primary'}`}
                            strokeWidth={3}
                          />
                        </div>
                        {f}
                      </li>
                    ))}
                  </ul>

                  {selected && (
                    <div className="absolute top-4 right-4">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center bg-primary">
                        <Check className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={3} />
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col items-center gap-5">
            <button
              type="button"
              onClick={payWithCrypto}
              disabled={paying}
              className="group w-full max-w-lg relative flex items-center justify-center gap-3 px-6 sm:px-8 py-4 sm:py-5 rounded-2xl bg-primary text-primary-foreground font-semibold text-base sm:text-lg hover:scale-[1.02] active:scale-95 transition-all cursor-pointer shadow-[0_15px_40px_-10px_hsl(var(--primary)/0.5)] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {paying ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating invoice…
                </>
              ) : (
                <>
                  <Bitcoin className="w-5 h-5 sm:w-6 sm:h-6" />
                  Pay ${selectedPrice} with Crypto
                </>
              )}
            </button>

            <footer className="text-center space-y-2">
              <p className="text-[10px] text-muted-foreground font-medium tracking-[0.2em] uppercase">
                Powered by <span className="text-foreground">OxaPay</span>
              </p>
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-success" />
                  On-chain verified
                </span>
                <span className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  No credit card needed
                </span>
              </div>
            </footer>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
