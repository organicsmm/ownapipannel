import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, ShieldAlert, History } from 'lucide-react';
import { format } from 'date-fns';

const SUB_EVENT_TYPES = [
  'subscription_activated',
  'blocked_activation_attempt',
  'activation_missing_deposit',
  'activation_user_mismatch',
  'activation_plan_mismatch',
  'activation_amount_mismatch',
];

const DANGER_EVENTS = new Set([
  'blocked_activation_attempt',
  'activation_user_mismatch',
  'activation_plan_mismatch',
  'activation_amount_mismatch',
  'activation_missing_deposit',
]);

const statusColor = (status: string) =>
  status === 'active' ? 'bg-success/15 text-success border-success/30'
  : status === 'expired' ? 'bg-warning/15 text-warning border-warning/30'
  : status === 'cancelled' ? 'bg-destructive/15 text-destructive border-destructive/30'
  : 'bg-muted text-muted-foreground';

export function SubscriptionAuditPanel() {
  const { data: allSubs, isLoading: subsLoading } = useQuery({
    queryKey: ['admin-all-subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('id, user_id, plan_type, status, activated_at, expires_at, updated_at, created_at')
        .order('updated_at', { ascending: false })
        .limit(300);
      if (error) throw error;

      const userIds = Array.from(new Set(data.map((s) => s.user_id)));
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email, full_name')
        .in('user_id', userIds);

      return data.map((s) => ({
        ...s,
        profile: profiles?.find((p) => p.user_id === s.user_id) ?? null,
      }));
    },
  });

  const { data: auditRows, isLoading: auditLoading } = useQuery({
    queryKey: ['admin-subscription-audit'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('security_audit_log')
        .select('id, event_type, user_id, reason, metadata, created_at')
        .in('event_type', SUB_EVENT_TYPES)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as Array<{
        id: string;
        event_type: string;
        user_id: string | null;
        reason: string | null;
        metadata: Record<string, unknown> | null;
        created_at: string;
      }>;
    },
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            All Subscriptions ({allSubs?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {subsLoading ? (
            <div className="py-10 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !allSubs?.length ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No subscriptions yet.</p>
          ) : (
            <ScrollArea className="h-[520px] pr-3">
              <div className="space-y-2">
                {allSubs.map((s) => (
                  <div key={s.id} className="p-3 rounded-lg border bg-card/50 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {s.profile?.email ?? s.user_id.slice(0, 8) + '…'}
                        </p>
                        {s.profile?.full_name && (
                          <p className="text-xs text-muted-foreground truncate">
                            {s.profile.full_name}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className={statusColor(s.status)}>
                        {s.status}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Plan: <span className="text-foreground">{s.plan_type}</span></span>
                      {s.activated_at && (
                        <span>Activated: {format(new Date(s.activated_at), 'dd MMM yyyy HH:mm')}</span>
                      )}
                      <span>
                        Expires: {s.expires_at ? format(new Date(s.expires_at), 'dd MMM yyyy') : '—'}
                      </span>
                      <span>Updated: {format(new Date(s.updated_at), 'dd MMM HH:mm')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-warning" />
            Status Changes & Security Events ({auditRows?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {auditLoading ? (
            <div className="py-10 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !auditRows?.length ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No subscription-related audit events.
            </p>
          ) : (
            <ScrollArea className="h-[520px] pr-3">
              <div className="space-y-2">
                {auditRows.map((row) => {
                  const danger = DANGER_EVENTS.has(row.event_type);
                  return (
                    <div
                      key={row.id}
                      className={`p-3 rounded-lg border text-sm ${
                        danger ? 'border-destructive/30 bg-destructive/5' : 'bg-card/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Badge
                          variant="outline"
                          className={
                            danger
                              ? 'bg-destructive/15 text-destructive border-destructive/30'
                              : 'bg-success/15 text-success border-success/30'
                          }
                        >
                          {row.event_type}
                        </Badge>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {format(new Date(row.created_at), 'dd MMM HH:mm:ss')}
                        </span>
                      </div>
                      {row.reason && (
                        <p className="mt-2 text-xs text-foreground/90">{row.reason}</p>
                      )}
                      {row.user_id && (
                        <p className="mt-1 text-[11px] text-muted-foreground font-mono">
                          user: {row.user_id.slice(0, 8)}…
                        </p>
                      )}
                      {row.metadata && Object.keys(row.metadata).length > 0 && (
                        <pre className="mt-2 text-[11px] bg-muted/50 rounded p-2 overflow-x-auto">
                          {JSON.stringify(row.metadata, null, 2)}
                        </pre>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
