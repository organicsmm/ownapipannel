import { useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Reads ?sub=success&order_id=oxs_... after user returns from OxaPay.
 * Polls oxapay-sync-deposit every 4s (max 2min). Server re-checks OxaPay
 * for real payment status. The URL param alone NEVER activates anything.
 */
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

    const toastId = toast.loading('Verifying crypto payment on-chain…');
    let attempts = 0;
    const maxAttempts = 30; // 30 × 4s = 2 min
    let cancelled = false;

    const clearUrl = () => {
      const clean = new URLSearchParams(location.search);
      clean.delete('sub');
      clean.delete('order_id');
      navigate({ pathname: location.pathname, search: clean.toString() }, { replace: true });
    };

    const poll = async () => {
      if (cancelled) return;
      attempts += 1;
      try {
        const { data, error } = await supabase.functions.invoke('oxapay-sync-deposit', {
          body: { order_id: orderId },
        });
        if (error) throw new Error(error.message);
        if ((data as any)?.credited) {
          toast.success('✅ Subscription activated!', { id: toastId });
          await qc.invalidateQueries({ queryKey: ['user-subscription'] });
          clearUrl();
          return;
        }
      } catch (_e) { /* retry */ }

      if (attempts >= maxAttempts) {
        toast.info('Still verifying — check back in a minute.', { id: toastId });
        clearUrl();
        return;
      }
      setTimeout(poll, 4000);
    };

    poll();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  return null;
}
