import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Loader2,
  IndianRupee,
  ArrowLeft,
  CheckCircle2,
  Send,
  ArrowRight,
  QrCode,
  Sparkles,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';

const TELEGRAM_SUPPORT = "https://t.me/whopcampaign";

export default function RazorpayDepositCard() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const { rates } = useCurrency();
  const [inrAmount, setInrAmount] = useState('');
  const [usdCredit, setUsdCredit] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'amount' | 'checkout' | 'done'>('amount');

  useEffect(() => {
    const val = parseFloat(inrAmount);
    if (!isNaN(val) && val > 0) {
      const inrRate = rates['INR'] || 83.5;
      setUsdCredit(parseFloat((val / inrRate).toFixed(2)));
    } else {
      setUsdCredit(0);
    }
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
    if (typeof window === 'undefined') {
      throw new Error('Payment checkout is only available in the browser.');
    }

    if ((window as Window & { Razorpay?: unknown }).Razorpay) {
      return true;
    }

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

    return true;
  };

  const handlePaymentSuccess = async (paymentId: string) => {
    const { data, error } = await supabase.functions.invoke('verify-razorpay-deposit', {
      body: {
        paymentId,
        claimedUsdAmount: usdCredit,
        inrAmount: amountNumber,
      },
    });

    if (error) {
      throw new Error(error.message || 'Payment verification failed.');
    }

    if (data?.error) {
      throw new Error(data.error);
    }

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

    if (!user || !profile) {
      toast({ title: 'Login required', description: 'Please sign in again and retry the payment.', variant: 'destructive' });
      return;
    }

    setLoading(true);

    try {
      await loadRazorpayScript();

      const key = import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!key) {
        throw new Error('Razorpay public key is not configured.');
      }

      const razorpay = (window as Window & { Razorpay?: new (options: Record<string, unknown>) => { open: () => void } }).Razorpay;
      if (!razorpay) {
        throw new Error('Razorpay checkout is unavailable right now.');
      }

      const instance = new razorpay({
        key,
        amount: Math.round(amountNumber * 100),
        currency: 'INR',
        name: 'Organic SMM Pro',
        description: `Wallet deposit for ${profile.email || user.email || 'your account'}`,
        image: '/favicon.ico',
        prefill: {
          name: profile.full_name || '',
          email: profile.email || user.email || '',
        },
        notes: {
          user_id: user.id,
          user_email: profile.email || user.email || '',
          deposit_type: 'wallet_topup',
          inr_amount: String(amountNumber),
          usd_amount: usdCredit.toFixed(2),
        },
        theme: {
          color: '#16a34a',
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
          escape: true,
          backdropclose: false,
        },
        handler: async (response: { razorpay_payment_id?: string }) => {
          if (!response?.razorpay_payment_id) {
            setLoading(false);
            toast({ title: 'Payment not completed', description: 'No payment reference received from Razorpay.', variant: 'destructive' });
            return;
          }

          try {
            await handlePaymentSuccess(response.razorpay_payment_id);
          } catch (err: any) {
            toast({ title: 'Verification failed', description: err.message || 'Payment captured but wallet credit failed.', variant: 'destructive' });
          } finally {
            setLoading(false);
          }
        },
      });

      instance.open();
      setStep('checkout');
    } catch (err: any) {
      setLoading(false);
      toast({ title: 'Checkout failed', description: err.message || 'Could not start Razorpay checkout.', variant: 'destructive' });
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="rounded-2xl overflow-hidden border border-border bg-background shadow-sm">

        {/* Progress bar */}
        <div className="flex gap-1 px-4 pt-3">
          <div className="h-1 flex-1 rounded-full bg-primary" />
          <div className={`h-1 flex-1 rounded-full ${['checkout', 'done'].includes(step) ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`h-1 flex-1 rounded-full ${step === 'done' ? 'bg-primary' : 'bg-muted'}`} />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border p-5 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <IndianRupee className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-[16px] font-bold text-foreground">UPI / Card Deposit</h2>
            <p className="text-[10px] font-medium text-primary">Instant wallet credit • Razorpay Checkout</p>
          </div>
        </div>

        {/* STEP 1: Amount */}
        {step === 'amount' && (
          <div className="p-5 space-y-5">
            <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center border border-border text-primary">
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
              <p className="text-[11px] font-semibold mb-2 text-muted-foreground">Amount (INR)</p>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[18px] font-bold text-primary">₹</span>
                <Input
                  type="number"
                  min={minimumAmount}
                  step="1"
                  value={inrAmount}
                  onChange={(e) => setInrAmount(e.target.value)}
                  placeholder="0.00"
                  className="h-14 pl-10 rounded-xl text-xl font-bold border-border bg-muted/30 text-foreground"
                />
                {usdCredit > 0 && (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-primary">
                    ≈ ${usdCredit.toFixed(2)}
                  </span>
                )}
              </div>
              <p className="text-[10px] mt-2 text-center text-muted-foreground">
                Min: ₹{minimumAmount} • 1 USD ≈ ₹{inrRate}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">You pay</span>
                <span className="font-semibold text-foreground">₹{amountNumber > 0 ? amountNumber.toFixed(0) : '0'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Wallet credit</span>
                <span className="font-semibold text-primary">${usdCredit.toFixed(2)}</span>
              </div>
            </div>

            <Button
              onClick={handleStartCheckout}
              disabled={loading || !isAmountValid}
              className="w-full h-13 rounded-xl text-[14px] font-bold"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Starting checkout...
                </>
              ) : (
                <>
                  {checkoutLabel} <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        )}

        {/* STEP 2: Checkout */}
        {step === 'checkout' && (
          <div className="p-5 space-y-5">
            <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</div>
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

            <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-3">
              <div className="flex items-center gap-2 text-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">Manual proof ki zarurat nahi hai</p>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">Agar popup close ho gaya ho to dubara checkout start kar sakte ho. Same successful Razorpay payment ko backend duplicate credit nahi karega.</p>
            </div>

            <Button
              onClick={handleStartCheckout}
              disabled={loading}
              variant="outline"
              className="w-full h-12 rounded-xl"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Waiting for payment...
                </>
              ) : (
                <>
                  Re-open checkout <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>

            <button onClick={() => setStep('amount')} className="text-[11px] font-medium flex items-center gap-1 mx-auto text-muted-foreground">
              <ArrowLeft className="h-3 w-3" /> Back
            </button>
          </div>
        )}

        {/* STEP 3: Done */}
        {step === 'done' && (
          <div className="p-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: 'rgba(16,185,129,.1)' }}>
              <CheckCircle2 className="h-8 w-8" style={{ color: '#10b981' }} />
            </div>
            <div>
              <h3 className="text-xl font-bold" style={{ color: '#1a1a2e' }}>Submitted!</h3>
              <p className="text-[12px] mt-1" style={{ color: '#10b981' }}>Pending Admin Approval</p>
            </div>
            <p className="text-[13px] p-3 rounded-xl" style={{ background: 'rgba(0,0,0,.02)', color: '#666', border: '1px solid rgba(0,0,0,.04)' }}>
              Your deposit will be credited within <strong>5-10 minutes</strong>.
            </p>
            <Button onClick={() => setStep('amount')} className="w-full h-11 rounded-xl font-semibold" style={{ background: '#16a34a', color: 'white' }}>
              Done
            </Button>
          </div>
        )}

        {/* Support */}
        <div className="px-5 pb-5">
          <a href={TELEGRAM_SUPPORT} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-between p-3 rounded-xl transition-colors"
            style={{ background: 'rgba(0,0,0,.02)', border: '1px solid rgba(0,0,0,.04)' }}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: '#10b981' }} />
              <span className="text-[11px] font-medium" style={{ color: '#999' }}>Need help?</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: '#0ea5e9' }}>
              <Send className="h-3 w-3" /> Telegram Support
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
