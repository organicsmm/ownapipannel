import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Zap, Crown, Star, CheckCircle2, Sparkles, Bitcoin } from 'lucide-react';

interface SubscriptionCheckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Plan = 'monthly' | 'yearly' | 'yearly_plus' | 'lifetime';

const PLAN_META: Record<Plan, {
  label: string; price: number; suffix: string; icon: any; color: string; features: string[]; badge?: string;
}> = {
  monthly:     { label: 'Monthly',     price: 35,  suffix: '/month',   icon: Zap,    color: 'primary', features: ['30 days access', 'Full platform', 'Cancel anytime'] },
  yearly:      { label: 'Yearly',      price: 100, suffix: '/year',    icon: Star,   color: 'primary', features: ['365 days access', 'Save vs monthly', 'All features'], badge: 'Popular' },
  yearly_plus: { label: 'Yearly Plus', price: 200, suffix: '/year',    icon: Sparkles, color: 'primary', features: ['365 days premium', 'Priority support', 'Everything included'] },
  lifetime:    { label: 'Lifetime',    price: 500, suffix: 'one-time', icon: Crown,  color: 'amber',   features: ['Forever access', 'All future updates', 'Best value'], badge: 'Best' },
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            Choose Your Plan
          </DialogTitle>
          <DialogDescription>
            Pay with any crypto (BTC, USDT, ETH, LTC…). Auto-converts to USDT.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3">
          {(Object.keys(PLAN_META) as Plan[]).map((plan) => {
            const meta = PLAN_META[plan];
            const Icon = meta.icon;
            const selected = selectedPlan === plan;
            const isAmber = meta.color === 'amber';
            return (
              <button
                key={plan}
                type="button"
                onClick={() => setSelectedPlan(plan)}
                className={`relative text-left p-3 rounded-xl border-2 transition-all ${
                  selected
                    ? isAmber ? 'border-amber-500 bg-amber-500/5' : 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                {meta.badge && (
                  <Badge className={`absolute -top-2 right-2 text-[10px] px-1.5 py-0.5 border-0 ${
                    isAmber ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white' : 'bg-primary text-primary-foreground'
                  }`}>
                    {meta.badge}
                  </Badge>
                )}
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isAmber ? 'bg-amber-500/10' : 'bg-primary/10'
                  }`}>
                    <Icon className={`h-4 w-4 ${isAmber ? 'text-amber-500' : 'text-primary'}`} />
                  </div>
                  {selected && <CheckCircle2 className={`h-4 w-4 ${isAmber ? 'text-amber-500' : 'text-primary'}`} />}
                </div>
                <h3 className="font-semibold text-sm mb-1">{meta.label}</h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-2xl font-black">${meta.price}</span>
                  <span className="text-[10px] text-muted-foreground">{meta.suffix}</span>
                </div>
                <ul className="space-y-1 text-[10px] text-muted-foreground">
                  {meta.features.map((f) => (
                    <li key={f} className="flex items-center gap-1">
                      <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        <Button
          className="w-full btn-gradient rounded-xl py-6 text-base"
          onClick={payWithCrypto}
          disabled={paying}
        >
          {paying ? (
            <>Processing…</>
          ) : (
            <>
              <Bitcoin className="h-5 w-5 mr-2" />
              Pay ${PLAN_META[selectedPlan].price} with Crypto
            </>
          )}
        </Button>
        <p className="text-[11px] text-center text-muted-foreground -mt-1">
          Powered by OxaPay. Payment auto-verifies on-chain. No credit card needed.
        </p>
      </DialogContent>
    </Dialog>
  );
}
