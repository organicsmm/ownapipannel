import { useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Reads ?sub=success&order_id=oxs_... after user returns from OxaPay.
 * Polls oxapay-sync-deposit every 4s until credited, the payment terminally
 * fails, or the overall 2-minute timeout elapses. The URL param alone NEVER
 * activates anything — the server re-verifies with OxaPay each poll.
 */
const POLL_INTERVAL_MS = 4000;
const MAX_DURATION_MS = 2 * 60 * 1000; // 2 min hard cap
const MAX_CONSECUTIVE_ERRORS = 4;

// Statuses OxaPay uses to signal a payment will not complete.
const TERMINAL_FAIL = new Set(['Expired', 'Failed', 'Cancelled', 'Canceled', 'Refunded']);

export function OxapaySubscriptionPoller() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const startedRef = useRef<string | null>(null);

  useEffect(() => {
    const sub = params.get('sub');
    const orderId = params.get('order_id');
    if (sub !== 'success' || !orderId) return;
    if (startedRef.current === orderId) return;
    startedRef.current = orderId;

    const toastId = toast.loading('Verifying crypto payment on-chain…', {
      description: `Order ${orderId.slice(0, 16)}…`,
    });
    const startedAt = Date.now();
    let consecutiveErrors = 0;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const clearUrl = () => {
      const clean = new URLSearchParams(location.search);
      clean.delete('sub');
      clean.delete('order_id');
      navigate({ pathname: location.pathname, search: clean.toString() }, { replace: true });
    };

    const stop = () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };

    const poll = async () => {
      if (cancelled) return;
      const elapsed = Date.now() - startedAt;

      try {
        const { data, error } = await supabase.functions.invoke('oxapay-sync-deposit', {
          body: { order_id: orderId },
        });
        if (error) throw new Error(error.message || 'Verification request failed');

        const payload = (data ?? {}) as {
          credited?: boolean;
          status?: string;
          error?: string;
          plan_type?: 'monthly' | 'yearly' | 'lifetime';
          amount_usd?: number;
        };

        if (payload.error) throw new Error(payload.error);

        consecutiveErrors = 0;

        if (payload.credited) {
          const PLAN_LABEL: Record<string, string> = {
            monthly: 'Monthly',
            yearly: 'Yearly',
            lifetime: 'Lifetime',
          };
          const PLAN_PRICE: Record<string, string> = {
            monthly: '$1',
            yearly: '$249',
            lifetime: '$499',
          };
          const plan = payload.plan_type ?? '';
          const label = PLAN_LABEL[plan] ?? 'Subscription';
          const price = payload.amount_usd
            ? `$${payload.amount_usd}`
            : PLAN_PRICE[plan] ?? '';
          const suffix =
            plan === 'monthly' ? '/month' : plan === 'yearly' ? '/year' : plan === 'lifetime' ? ' one-time' : '';

          toast.success(`✅ ${label} plan activated!`, {
            id: toastId,
            description: price
              ? `${price}${suffix} — redirecting you to set up your providers…`
              : 'Redirecting you to set up your providers…',
            duration: 8000,
          });
          await qc.invalidateQueries({ queryKey: ['user-subscription'] });
          clearUrl();
          stop();
          // Auto-redirect into the newly unlocked area so the user can start
          // adding providers / building bundles right away.
          setTimeout(() => {
            navigate('/my-providers', { replace: true });
          }, 900);
          return;

        }

        if (payload.status && TERMINAL_FAIL.has(payload.status)) {
          toast.error(`Payment ${payload.status.toLowerCase()}`, {
            id: toastId,
            description: 'No charge was applied. You can start a new checkout.',
          });
          clearUrl();
          stop();
          return;
        }
      } catch (e) {
        consecutiveErrors += 1;
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          toast.error('Could not reach payment verifier', {
            id: toastId,
            description:
              (e as Error)?.message ??
              'Network error. Your payment is safe — refresh in a minute to retry.',
          });
          clearUrl();
          stop();
          return;
        }
      }

      if (elapsed >= MAX_DURATION_MS) {
        toast.warning('Still verifying your payment', {
          id: toastId,
          description:
            'This is taking longer than usual. If you paid, it will activate automatically — refresh in a minute.',
          duration: 10000,
        });
        clearUrl();
        stop();
        return;
      }

      timer = setTimeout(poll, POLL_INTERVAL_MS);
    };

    poll();
    return () => { stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  return null;
}
