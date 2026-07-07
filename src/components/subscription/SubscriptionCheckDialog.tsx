import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Lock, Bitcoin, Check, Loader2 } from 'lucide-react';

interface SubscriptionCheckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Plan = 'monthly' | 'yearly' | 'lifetime';

type PlanMeta = {
  label: string;
  price: number;
  suffix: string;
  accent: 'indigo' | 'amber';
  features: string[];
  badge?: string;
};

const PLAN_META: Record<Plan, PlanMeta> = {
  monthly:  { label: 'Monthly',  price: 29,  suffix: '/mo',       accent: 'indigo', features: ['30 days access', 'Full platform', 'Cancel anytime'] },
  yearly:   { label: 'Yearly',   price: 249, suffix: '/year',     accent: 'indigo', features: ['365 days access', 'Save vs monthly', 'All features unlocked'], badge: 'Most Popular' },
  lifetime: { label: 'Lifetime', price: 499, suffix: 'one-time',  accent: 'amber',  features: ['Forever access', 'All future updates', 'Best value'], badge: 'Best' },
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
      <DialogContent className="max-w-5xl p-0 border-white/10 bg-[#0d0d0d] rounded-[2rem] overflow-hidden text-slate-200">
        {/* Background glow */}
        <div className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 bg-indigo-600/20 blur-[120px] rounded-full" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full" />

        <div className="relative px-5 sm:px-8 pt-8 sm:pt-10 pb-8 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="text-center items-center space-y-3 mb-8 sm:mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] sm:text-xs font-semibold tracking-wider uppercase text-indigo-400">
              <Lock className="w-3.5 h-3.5" />
              Secure Checkout
            </div>
            <DialogTitle className="text-3xl sm:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60 tracking-tight">
              Choose Your Plan
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-sm">
              Pay with BTC, USDT, ETH, or LTC. Instant on-chain verification.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 mb-10 md:pt-4">
            {(Object.keys(PLAN_META) as Plan[]).map((plan) => {
              const meta = PLAN_META[plan];
              const selected = selectedPlan === plan;
              const isAmber = meta.accent === 'amber';
              const accentText = isAmber ? 'text-amber-400' : 'text-indigo-400';
              const badgeBg = isAmber ? 'bg-amber-500 text-black' : 'bg-indigo-500 text-white';
              const selectedCardCls = isAmber
                ? 'border-amber-500 bg-amber-500/5 shadow-[0_0_40px_-10px_rgba(245,158,11,0.4)] md:scale-[1.03]'
                : 'border-indigo-500 bg-indigo-600/10 shadow-[0_0_40px_-10px_rgba(99,102,241,0.4)] md:scale-[1.03]';

              return (
                <button
                  key={plan}
                  type="button"
                  onClick={() => setSelectedPlan(plan)}
                  className={`group relative text-left p-5 sm:p-6 rounded-3xl border-2 transition-all duration-300 ${
                    selected
                      ? selectedCardCls + ' z-10'
                      : 'border-white/5 bg-white/[0.02] hover:border-white/20'
                  }`}
                >
                  {meta.badge && (
                    <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight whitespace-nowrap ${badgeBg}`}>
                      {meta.badge}
                    </div>
                  )}

                  <div className="mb-5 sm:mb-6">
                    <p className={`${accentText} font-semibold text-xs tracking-widest uppercase mb-1`}>
                      {meta.label}
                    </p>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl sm:text-4xl font-bold text-white">${meta.price}</span>
                      <span className={`text-sm ${isAmber ? 'uppercase tracking-widest text-[10px] font-bold text-slate-500' : 'text-slate-500'}`}>
                        {meta.suffix}
                      </span>
                    </div>
                  </div>

                  <ul className="space-y-3 sm:space-y-4">
                    {meta.features.map((f) => (
                      <li key={f} className={`flex items-center gap-3 text-sm ${selected ? 'text-white' : 'text-slate-300'}`}>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                          selected
                            ? isAmber ? 'bg-amber-500/30' : 'bg-indigo-500'
                            : 'bg-white/5 group-hover:bg-white/10'
                        }`}>
                          <Check className={`w-3 h-3 ${selected ? (isAmber ? 'text-amber-200' : 'text-white') : accentText}`} strokeWidth={3} />
                        </div>
                        {f}
                      </li>
                    ))}
                  </ul>

                  {selected && (
                    <div className="absolute top-4 right-4">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isAmber ? 'bg-amber-500' : 'bg-indigo-500'}`}>
                        <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
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
              className="group w-full max-w-lg relative flex items-center justify-center gap-3 px-6 sm:px-8 py-4 sm:py-5 rounded-2xl bg-white text-black font-bold text-base sm:text-lg hover:scale-[1.02] active:scale-95 transition-all cursor-pointer shadow-[0_10px_30px_-5px_rgba(255,255,255,0.2)] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
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
              <p className="text-[10px] text-slate-500 font-medium tracking-[0.2em] uppercase">
                Powered by <span className="text-slate-300">OxaPay</span>
              </p>
              <div className="flex items-center justify-center gap-4 text-xs text-slate-500 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-green-500" />
                  On-chain verified
                </span>
                <span className="flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-indigo-500" />
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
