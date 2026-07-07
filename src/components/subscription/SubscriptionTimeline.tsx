import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CheckCircle2, Clock, Loader2, XCircle, Radio, Webhook, ShieldCheck, Send } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

type StepState = 'done' | 'active' | 'failed' | 'idle';

const stateStyles: Record<StepState, string> = {
  done: 'border-primary/40 bg-primary/10 text-primary',
  active: 'border-amber-500/40 bg-amber-500/10 text-amber-500 animate-pulse',
  failed: 'border-destructive/40 bg-destructive/10 text-destructive',
  idle: 'border-border bg-background text-muted-foreground',
};

const isFailedStatus = (s?: string | null) =>
  !!s && ['Expired', 'Failed', 'Cancelled', 'Canceled', 'Refunded'].includes(s);

export function SubscriptionTimeline() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['subscription-timeline', user?.id],
    enabled: !!user?.id,
    refetchInterval: 15000,
    queryFn: async () => {
      const [depRes, subRes] = await Promise.all([
        supabase
          .from('oxapay_deposits')
          .select('order_id, plan_type, amount_usd, track_id, pay_link, status, credited, created_at, updated_at')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('subscriptions')
          .select('plan_type, status, activated_at, expires_at, updated_at, activation_source')
          .eq('user_id', user!.id)
          .maybeSingle(),
      ]);
      if (depRes.error) throw depRes.error;
      if (subRes.error) throw subRes.error;
      return { deposit: depRes.data, subscription: subRes.data };
    },
  });

  if (isLoading) {
    return (
      <div className="rounded-md border border-border bg-card p-5 flex items-center gap-3">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          :loading_subscription
        </span>
      </div>
    );
  }

  const deposit = data?.deposit;
  const sub = data?.subscription;

  if (!deposit && (!sub || sub.status !== 'active')) {
    return null; // Nothing to show — user hasn't started checkout and has no active sub
  }

  const paidStatuses = ['Paid', 'Confirmed', 'Confirming', 'Completed'];
  const failed = isFailedStatus(deposit?.status);
  const activated = sub?.status === 'active' && !!sub?.activated_at;

  const steps: Array<{ icon: typeof Send; label: string; state: StepState; detail?: string }> = [
    {
      icon: Send,
      label: 'Invoice created',
      state: deposit ? 'done' : 'idle',
      detail: deposit ? `#${deposit.order_id.slice(0, 20)}…` : undefined,
    },
    {
      icon: Radio,
      label: 'Payment received',
      state: failed
        ? 'failed'
        : deposit && (deposit.credited || paidStatuses.includes(deposit.status ?? ''))
          ? 'done'
          : deposit
            ? 'active'
            : 'idle',
      detail: deposit?.status ? `Status: ${deposit.status}` : undefined,
    },
    {
      icon: Webhook,
      label: 'Webhook verified',
      state: failed
        ? 'idle'
        : deposit?.credited
          ? 'done'
          : deposit && paidStatuses.includes(deposit.status ?? '')
            ? 'active'
            : 'idle',
      detail: deposit?.track_id ? `Track: ${deposit.track_id}` : undefined,
    },
    {
      icon: ShieldCheck,
      label: activated ? 'Subscription activated' : failed ? 'Activation failed' : 'Awaiting activation',
      state: failed ? 'failed' : activated ? 'done' : deposit?.credited ? 'active' : 'idle',
      detail: activated && sub?.activated_at
        ? `Activated ${formatDistanceToNow(new Date(sub.activated_at), { addSuffix: true })}`
        : undefined,
    },
  ];

  return (
    <div className="rounded-md border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-foreground">
            :subscription_timeline
          </h2>
        </div>
        {sub?.status && (
          <span
            className={`font-mono text-[9px] uppercase tracking-[0.15em] px-2 py-1 rounded border ${
              activated
                ? 'border-primary/30 text-primary bg-primary/5'
                : failed
                  ? 'border-destructive/30 text-destructive bg-destructive/10'
                  : 'border-border text-muted-foreground bg-secondary/50'
            }`}
          >
            {sub.status}
          </span>
        )}
      </div>

      <div className="px-5 py-5">
        <ol className="grid grid-cols-1 sm:grid-cols-4 gap-4 sm:gap-2">
          {steps.map((step, i) => {
            const Icon =
              step.state === 'done' ? CheckCircle2 : step.state === 'failed' ? XCircle : step.state === 'active' ? Clock : step.icon;
            return (
              <li key={i} className="flex sm:flex-col gap-3 sm:gap-2 items-start relative">
                <div
                  className={`w-9 h-9 rounded-md border flex items-center justify-center shrink-0 ${stateStyles[step.state]}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-foreground">{step.label}</p>
                  {step.detail && (
                    <p className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">
                      {step.detail}
                    </p>
                  )}
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden sm:block absolute top-4 left-[calc(50%+22px)] right-[calc(-50%+22px)] h-px bg-border" />
                )}
              </li>
            );
          })}
        </ol>

        {(deposit?.track_id || sub?.expires_at || deposit?.amount_usd) && (
          <div className="mt-5 pt-4 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-4">
            {deposit?.plan_type && (
              <Field label=":plan" value={deposit.plan_type} />
            )}
            {typeof deposit?.amount_usd === 'number' && (
              <Field label=":amount" value={`$${deposit.amount_usd}`} />
            )}
            {deposit?.track_id && (
              <Field label=":track_id" value={deposit.track_id} mono />
            )}
            <Field
              label=":expires_at"
              value={
                sub?.expires_at
                  ? format(new Date(sub.expires_at), 'dd MMM yyyy')
                  : activated
                    ? 'Never (lifetime)'
                    : '—'
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
        {label}
      </p>
      <p className={`text-[12px] text-foreground truncate ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}
