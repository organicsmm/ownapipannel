import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Loader2, ShieldCheck, RefreshCw } from 'lucide-react';

type TestStatus = 'idle' | 'running' | 'pass' | 'fail';

interface Test {
  id: string;
  name: string;
  description: string;
  expected: string;
  status: TestStatus;
  detail?: string;
}

const INITIAL_TESTS: Test[] = [
  {
    id: 'rpc_block',
    name: 'Client cannot call activation RPC',
    description: 'Try activate_subscription_oxapay from browser',
    expected: 'Should throw "Not permitted"',
    status: 'idle',
  },
  {
    id: 'insert_block',
    name: 'Client cannot INSERT into subscriptions',
    description: 'Try to create own active subscription',
    expected: 'Should be denied by RLS/GRANT',
    status: 'idle',
  },
  {
    id: 'update_block',
    name: 'Client cannot UPDATE subscriptions',
    description: 'Try to flip status to active',
    expected: 'Should be denied by RLS/GRANT',
    status: 'idle',
  },
  {
    id: 'sync_stranger',
    name: 'Cannot sync a stranger\'s order',
    description: 'Call sync with a fake order_id',
    expected: 'Should return 404 / Order not found',
    status: 'idle',
  },
  {
    id: 'audit_hidden',
    name: 'Non-admin cannot read security_audit_log',
    description: 'Try to SELECT security events',
    expected: 'Should return 0 rows (RLS filters)',
    status: 'idle',
  },
];

export default function SecurityTestPage() {
  const { user, isAdmin } = useAuth();
  const { subscription, hasActiveSubscription } = useSubscription();
  const [tests, setTests] = useState<Test[]>(INITIAL_TESTS);
  const [running, setRunning] = useState(false);
  const [latestDeposit, setLatestDeposit] = useState<any>(null);

  const loadDeposit = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('oxapay_deposits')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setLatestDeposit(data);
  };

  useEffect(() => { loadDeposit(); }, [user?.id]);

  const setTest = (id: string, patch: Partial<Test>) =>
    setTests((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const runAll = async () => {
    if (!user) return;
    setRunning(true);
    setTests(INITIAL_TESTS.map((t) => ({ ...t, status: 'idle', detail: undefined })));

    // Test 1: RPC block
    setTest('rpc_block', { status: 'running' });
    try {
      const { error } = await supabase.rpc('activate_subscription_oxapay' as any, {
        p_user_id: user.id,
        p_order_id: 'HACK_' + Date.now(),
        p_plan: 'lifetime',
        p_amount_usd: 500,
        p_track_id: null,
      });
      if (error) {
        setTest('rpc_block', { status: 'pass', detail: `Blocked: ${error.message}` });
      } else {
        setTest('rpc_block', { status: 'fail', detail: 'RPC succeeded — critical vulnerability!' });
      }
    } catch (e: any) {
      setTest('rpc_block', { status: 'pass', detail: `Blocked: ${e.message}` });
    }

    // Test 2: INSERT block
    setTest('insert_block', { status: 'running' });
    try {
      const { error } = await supabase.from('subscriptions').insert({
        user_id: user.id, plan_type: 'lifetime', status: 'active', activated_at: new Date().toISOString(),
      } as any);
      if (error) {
        setTest('insert_block', { status: 'pass', detail: `Denied: ${error.message}` });
      } else {
        setTest('insert_block', { status: 'fail', detail: 'INSERT succeeded — critical!' });
      }
    } catch (e: any) {
      setTest('insert_block', { status: 'pass', detail: `Denied: ${e.message}` });
    }

    // Test 3: UPDATE block
    setTest('update_block', { status: 'running' });
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .update({ status: 'active', plan_type: 'lifetime' } as any)
        .eq('user_id', user.id)
        .select();
      if (error || !data || data.length === 0) {
        setTest('update_block', { status: 'pass', detail: error ? `Denied: ${error.message}` : 'Silently blocked (0 rows)' });
      } else {
        setTest('update_block', { status: 'fail', detail: 'UPDATE succeeded — critical!' });
      }
    } catch (e: any) {
      setTest('update_block', { status: 'pass', detail: `Denied: ${e.message}` });
    }

    // Test 4: sync stranger order
    setTest('sync_stranger', { status: 'running' });
    try {
      const { data, error } = await supabase.functions.invoke('oxapay-sync-deposit', {
        body: { order_id: 'oxs_nonexistent_' + Date.now() },
      });
      const errText = (error as any)?.message || (data as any)?.error || '';
      if (errText.toLowerCase().includes('not found') || (data as any)?.error) {
        setTest('sync_stranger', { status: 'pass', detail: `Rejected: ${errText || 'Order not found'}` });
      } else if ((data as any)?.credited) {
        setTest('sync_stranger', { status: 'fail', detail: 'Fake order credited — critical!' });
      } else {
        setTest('sync_stranger', { status: 'pass', detail: `Rejected: ${JSON.stringify(data)}` });
      }
    } catch (e: any) {
      setTest('sync_stranger', { status: 'pass', detail: `Rejected: ${e.message}` });
    }

    // Test 5: audit log hidden
    setTest('audit_hidden', { status: 'running' });
    try {
      const { data, error } = await supabase.from('security_audit_log').select('id').limit(5);
      if (error) {
        setTest('audit_hidden', { status: 'pass', detail: `Denied: ${error.message}` });
      } else if (!isAdmin && (data?.length ?? 0) > 0) {
        setTest('audit_hidden', { status: 'fail', detail: `Non-admin read ${data.length} rows — leak!` });
      } else {
        setTest('audit_hidden', {
          status: 'pass',
          detail: isAdmin ? `Admin sees ${data?.length ?? 0} rows (expected)` : 'Filtered to 0 rows',
        });
      }
    } catch (e: any) {
      setTest('audit_hidden', { status: 'pass', detail: `Denied: ${e.message}` });
    }

    setRunning(false);
    loadDeposit();
  };

  const passCount = tests.filter((t) => t.status === 'pass').length;
  const failCount = tests.filter((t) => t.status === 'fail').length;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-8 w-8 text-primary" />
            Security Test Checklist
          </h1>
          <p className="text-muted-foreground mt-1">
            Verify subscription system cannot be bypassed. All tests should <span className="text-emerald-500 font-semibold">PASS</span>.
          </p>
        </div>

        {/* Subscription status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Subscription</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Status">
              <Badge variant={hasActiveSubscription ? 'default' : 'secondary'}>
                {subscription?.status ?? 'none'}
              </Badge>
            </Row>
            <Row label="Plan">
              <span className="font-mono">{subscription?.plan_type ?? '—'}</span>
            </Row>
            <Row label="Activated">
              <span className="font-mono">{subscription?.activated_at ? new Date(subscription.activated_at).toLocaleString() : '—'}</span>
            </Row>
            <Row label="Expires">
              <span className="font-mono">{subscription?.expires_at ? new Date(subscription.expires_at).toLocaleString() : (hasActiveSubscription ? 'Never (lifetime)' : '—')}</span>
            </Row>
          </CardContent>
        </Card>

        {/* Latest deposit */}
        {latestDeposit && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Latest Crypto Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Order ID"><span className="font-mono text-xs">{latestDeposit.order_id}</span></Row>
              <Row label="Plan"><span className="font-mono">{latestDeposit.plan_type}</span></Row>
              <Row label="Amount"><span className="font-mono">${latestDeposit.amount_usd}</span></Row>
              <Row label="Status">
                <Badge variant={latestDeposit.credited ? 'default' : 'secondary'}>
                  {latestDeposit.status}
                </Badge>
              </Row>
              <Row label="Credited">
                {latestDeposit.credited
                  ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  : <span className="text-muted-foreground text-xs">pending</span>}
              </Row>
              <Row label="Created"><span className="font-mono text-xs">{new Date(latestDeposit.created_at).toLocaleString()}</span></Row>
            </CardContent>
          </Card>
        )}

        {/* Test runner */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Bypass Attack Tests</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {passCount} passed · {failCount} failed · {tests.length - passCount - failCount} pending
              </p>
            </div>
            <Button onClick={runAll} disabled={running || !user}>
              {running ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Running…</> : <><RefreshCw className="h-4 w-4 mr-2" /> Run All Tests</>}
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {tests.map((t) => (
              <div key={t.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                <div className="mt-0.5">
                  {t.status === 'idle' && <div className="h-5 w-5 rounded-full border-2 border-muted" />}
                  {t.status === 'running' && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                  {t.status === 'pass' && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                  {t.status === 'fail' && <XCircle className="h-5 w-5 text-destructive" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{t.name}</span>
                    {t.status === 'pass' && <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">PASS</Badge>}
                    {t.status === 'fail' && <Badge variant="destructive">FAIL</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Expected: <span className="italic">{t.expected}</span></p>
                  {t.detail && (
                    <p className="text-xs font-mono mt-1 p-2 rounded bg-muted/50 break-all">{t.detail}</p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <div>{children}</div>
    </div>
  );
}
