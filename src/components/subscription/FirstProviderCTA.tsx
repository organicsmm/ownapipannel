import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { KeyRound, Plus, ArrowRight, CheckCircle2, Boxes } from 'lucide-react';

/**
 * Onboarding CTA shown to subscribed users on the Dashboard.
 * - No providers yet → big "Add your first provider" card.
 * - Has providers but no bundles → nudge to build first bundle.
 * - Both exist → hide.
 */
export function FirstProviderCTA() {
  const { user, isAdmin } = useAuth();
  const { hasActiveSubscription } = useSubscription();
  const enabled = !!user && (isAdmin || hasActiveSubscription);

  const { data: providerCount } = useQuery({
    queryKey: ['user-provider-count', user?.id],
    enabled,
    queryFn: async () => {
      const { count } = await supabase
        .from('user_provider_accounts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user!.id);
      return count ?? 0;
    },
    staleTime: 30_000,
  });

  const { data: bundleCount } = useQuery({
    queryKey: ['user-bundle-count', user?.id],
    enabled: enabled && providerCount !== undefined && providerCount > 0,
    queryFn: async () => {
      const { count } = await supabase
        .from('user_bundles')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user!.id);
      return count ?? 0;
    },
    staleTime: 30_000,
  });

  if (!enabled || providerCount === undefined) return null;

  // Stage 1 — no provider yet
  if (providerCount === 0) {
    return (
      <div className="relative overflow-hidden rounded-md border border-primary/30 bg-gradient-to-br from-card via-card to-primary/5">
        <div className="pointer-events-none absolute -top-24 -right-16 w-64 h-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative p-5 sm:p-7 flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="w-14 h-14 rounded-md border border-primary/40 bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <KeyRound className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary mb-1">
              :getting_started · step 1 of 2
            </p>
            <h3 className="font-serif text-xl sm:text-2xl leading-tight text-foreground">
              Add your first provider<span className="text-primary italic">.</span>
            </h3>
            <p className="text-[13px] text-muted-foreground mt-1 max-w-lg">
              Connect an SMM API panel so every order you place is fulfilled through
              your own account — you set the margins, you keep the profit.
            </p>
          </div>
          <Link
            to="/my-providers?new=1"
            className="group h-11 px-5 rounded-md bg-primary text-primary-foreground font-mono text-[11px] uppercase tracking-[0.18em] flex items-center justify-center gap-2 hover:shadow-[0_15px_40px_-15px_hsl(var(--primary)/0.7)] transition-all shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> add provider
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    );
  }

  // Stage 2 — has providers, no bundles yet
  if (bundleCount === 0) {
    return (
      <div className="relative overflow-hidden rounded-md border border-primary/30 bg-gradient-to-br from-card via-card to-primary/5">
        <div className="pointer-events-none absolute -bottom-24 -left-16 w-64 h-64 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="relative p-5 sm:p-7 flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="w-14 h-14 rounded-md border border-primary/40 bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Boxes className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary mb-1 flex items-center gap-2">
              :getting_started · step 2 of 2
              <span className="inline-flex items-center gap-1 text-muted-foreground normal-case tracking-normal">
                <CheckCircle2 className="w-3 h-3 text-primary" /> provider connected
              </span>
            </p>
            <h3 className="font-serif text-xl sm:text-2xl leading-tight text-foreground">
              Build your first bundle<span className="text-primary italic">.</span>
            </h3>
            <p className="text-[13px] text-muted-foreground mt-1 max-w-lg">
              Combine multiple services into one reusable package — perfect for
              client campaigns and mass orders.
            </p>
          </div>
          <Link
            to="/my-bundles?new=1"
            className="group h-11 px-5 rounded-md bg-primary text-primary-foreground font-mono text-[11px] uppercase tracking-[0.18em] flex items-center justify-center gap-2 hover:shadow-[0_15px_40px_-15px_hsl(var(--primary)/0.7)] transition-all shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> new bundle
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
