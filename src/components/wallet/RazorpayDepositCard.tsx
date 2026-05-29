import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, IndianRupee, ArrowLeft, CheckCircle2, Send, ArrowRight, QrCode, Sparkles } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';

const TELEGRAM_SUPPORT = 'https://t.me/whopcampaign';

type RazorpayResponse = {
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
};

type RazorpayWindow = Window & {
  Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
};

export default function RazorpayDepositCard() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const { rates } = useCurrency();
  const [inrAmount, setInrAmount] = useState('');
  const [usdCredit, setUsdCredit] = useState(0);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'amount' | 'checkout' | 'done'>('amount');

  useEffect(() => {
    const val = parseFloat(inrAmount);
    if (!Number.isNaN(val) && val > 0) {
      const inrRate = rates['INR'] || 83.5;
      setUsdCredit(Number((val / inrRate).toFixed(2)));
      return;
    }
    setUsdCredit(0);
  }, [inrAmount, rates]);

  const inrRate = rates['INR'] || 83.5;
  const minimumAmount = 30;
  const amountNumber = Number(inrAmount || 0);
  const isAmountValid = Number.isFinite(amountNumber) && amountNumber >= minimumAmount;

  const checkoutLabel = useMemo(() => {
    if (!isAmountValid) return 'Pay securely';
    return `Pay ₹${Math.round(amountNumber)}`;
  }, [amountNumber, isAmountValid]);

  const loadRazorpayScript = async () => {
    if (typeof window === 'undefined') throw new Error('Payment checkout is only available in the browser.');
    if ((window as RazorpayWindow).Razorpay) return;

    await new Promise<void>((resolve, reject) => {
      const existingScript = document.querySelector('script[data-razorpay-checkout="true"]') as HTMLScriptElement | null;
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(), { once: true });
        existingScript.addEventListener('error', () => reject(new Error('Unable to load Razorpay checkout.')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.dataset.razorpayCheckout = 'true';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Unable to load Razorpay checkout.'));
      document.body.appendChild(script);
    });
  };

  const handlePaymentSuccess = async (response: RazorpayResponse) => {
    const { data, error } = await supabase.functions.invoke('verify-razorpay-deposit', {
      body: {
        paymentId: response.razorpay_payment_id,
        razorpayOrderId: response.razorpay_order_id,
        razorpaySignature: response.razorpay_signature,
        claimedUsdAmount: usdCredit,
        inrAmount: amountNumber,
      },
    });

    if (error) throw new Error(error.message || 'Payment verification failed.');
    if (data?.error) throw new Error(data.error);

    setStep('done');
    toast({
      title: 'Deposit added',
      description: data?.message || `₹${amountNumber} payment successful. Wallet updated automatically.`,
    });

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['wallet'] }),
      queryClient.invalidateQueries({ queryKey: ['transactions'] }),
      queryClient.invalidateQueries({ queryKey: ['profile'] }),
    ]);
  };

  const handleStartCheckout = async () => {
    if (!isAmountValid) {
      toast({ title: 'Invalid amount', description: 'Minimum deposit is ₹30', variant: 'destructive' });
      return;
    }

    if (!user) {
      toast({ title: 'Login required', description: 'Please sign in again and retry the payment.', variant: 'destructive' });
      return;
    }

    setLoading(true);

    try {
      await loadRazorpayScript();

      const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
        body: { inrAmount: amountNumber, usdAmount: usdCredit },
      });

      if (error) throw new Error(error.message || 'Could not prepare Razorpay checkout.');
      if (!data?.keyId || !data?.orderId) throw new Error('Incomplete Razorpay checkout details received.');

      const Razorpay = (window as RazorpayWindow).Razorpay;
      if (!Razorpay) throw new Error('Razorpay checkout is unavailable right now.');

      const checkout = new Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency || 'INR',
        order_id: data.orderId,
        name: 'Organic SMM Pro',
        description: `Wallet deposit for ${profile?.email || user.email || 'your account'}`,
        image: '/favicon.ico',
        prefill: {
          name: profile?.full_name || '',
          email: profile?.email || user.email || '',
        },
        notes: {
          user_id: user.id,
          user_email: profile?.email || user.email || '',
          deposit_type: 'wallet_topup',
          inr_amount: String(amountNumber),
          usd_amount: usdCredit.toFixed(2),
        },
        theme: { color: '#16a34a' },
        modal: {
          ondismiss: () => setLoading(false),
          escape: true,
          backdropclose: false,
        },
        handler: async (response: RazorpayResponse) => {
          try {
            await handlePaymentSuccess(response);
          } catch (err: any) {
            toast({ title: 'Verification failed', description: err.message || 'Payment captured but wallet credit failed.', variant: 'destructive' });
          } finally {
            setLoading(false);
          }
        },
      });

      setStep('checkout');
      checkout.open();
    } catch (err: any) {
      setLoading(false);
      toast({ title: 'Checkout failed', description: err.message || 'Could not start Razorpay checkout.', variant: 'destructive' });
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
        <div className="flex gap-1 px-4 pt-3">
          <div className="h-1 flex-1 rounded-full bg-primary" />
          <div className={`h-1 flex-1 rounded-full ${['checkout', 'done'].includes(step) ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`h-1 flex-1 rounded-full ${step === 'done' ? 'bg-primary' : 'bg-muted'}`} />
        </div>

        <div className="flex items-center gap-3 border-b border-border p-5 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <IndianRupee className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-[16px] font-bold text-foreground">UPI / Card Deposit</h2>
            <p className="text-[10px] font-medium text-primary">Instant wallet credit • Razorpay Checkout</p>
          </div>
        </div>

        {step === 'amount' && (
          <div className="space-y-5 p-5">
            <div className="space-y-4 rounded-2xl border border-primary/15 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-primary">
                  <QrCode className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">Same page pe Razorpay popup khulega</p>
                  <p className="text-xs text-muted-foreground">UPI, QR, card ya netbanking se payment complete hote hi wallet auto credit ho jayega.</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[500, 1000, 2500].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setInrAmount(String(amt))}
                    className={`h-11 rounded-xl border text-sm font-bold transition-all ${inrAmount === String(amt) ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-foreground hover:border-primary/40'}`}
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-[11px] font-semibold text-muted-foreground">Amount (INR)</p>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[18px] font-bold text-primary">₹</span>
                <Input
                  type="number"
                  min={minimumAmount}
                  step="1"
                  value={inrAmount}
                  onChange={(e) => setInrAmount(e.target.value)}
                  placeholder="0.00"
                  className="h-14 rounded-xl border-border bg-muted/30 pl-10 text-xl font-bold text-foreground"
                />
                {usdCredit > 0 && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-primary">≈ ${usdCredit.toFixed(2)}</span>}
              </div>
              <p className="mt-2 text-center text-[10px] text-muted-foreground">Min: ₹{minimumAmount} • 1 USD ≈ ₹{inrRate}</p>
            </div>

            <div className="space-y-2 rounded-2xl border border-border bg-muted/20 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">You pay</span>
                <span className="font-semibold text-foreground">₹{amountNumber > 0 ? amountNumber.toFixed(0) : '0'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Wallet credit</span>
                <span className="font-semibold text-primary">${usdCredit.toFixed(2)}</span>
              </div>
            </div>

            <Button onClick={handleStartCheckout} disabled={loading || !isAmountValid} className="h-12 w-full rounded-xl text-[14px] font-bold">
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Starting checkout...</> : <>{checkoutLabel} <ArrowRight className="ml-2 h-4 w-4" /></>}
            </Button>
          </div>
        )}

        {step === 'checkout' && (
          <div className="space-y-5 p-5">
            <div className="space-y-3 rounded-2xl border border-primary/15 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">2</div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">Checkout popup open ho chuka hai</p>
                  <p className="text-xs text-muted-foreground">Payment isi page ke upar Razorpay modal me complete hoga. Success ke baad wallet instantly update ho jayega.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border bg-background p-3">
                  <p className="text-[11px] text-muted-foreground">Amount</p>
                  <p className="text-lg font-bold text-foreground">₹{amountNumber.toFixed(0)}</p>
                </div>
                <div className="rounded-xl border border-border bg-background p-3">
                  <p className="text-[11px] text-muted-foreground">Auto credit</p>
                  <p className="text-lg font-bold text-primary">${usdCredit.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">Manual proof ki zarurat nahi hai</p>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">Agar popup close ho gaya ho to dubara checkout start kar sakte ho. Same successful Razorpay payment ko backend duplicate credit nahi karega.</p>
            </div>

            <Button onClick={handleStartCheckout} disabled={loading} variant="outline" className="h-12 w-full rounded-xl">
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Waiting for payment...</> : <>Re-open checkout <ArrowRight className="ml-2 h-4 w-4" /></>}
            </Button>

            <button onClick={() => setStep('amount')} className="mx-auto flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <ArrowLeft className="h-3 w-3" /> Back
            </button>
          </div>
        )}

        {step === 'done' && (
          <div className="space-y-5 p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">Wallet credited!</h3>
              <p className="mt-1 text-[12px] text-primary">Payment verified automatically</p>
            </div>
            <p className="rounded-xl border border-border bg-muted/20 p-3 text-[13px] text-muted-foreground">Aapka successful Razorpay payment isi account me auto add ho gaya hai. Transaction history bhi niche update ho chuki hai.</p>
            <Button onClick={() => { setInrAmount(''); setStep('amount'); }} className="h-11 w-full rounded-xl font-semibold">
              Add more funds
            </Button>
          </div>
        )}

        <div className="px-5 pb-5">
          <a href={TELEGRAM_SUPPORT} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-3 transition-colors">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <span className="text-[11px] font-medium text-muted-foreground">Need help?</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary">
              <Send className="h-3 w-3" /> Telegram Support
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
