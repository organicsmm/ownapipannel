import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type PlanType = 'none' | 'monthly' | 'yearly' | 'yearly_plus' | 'lifetime' | 'trial';

export interface Subscription {
  id: string;
  user_id: string;
  plan_type: PlanType;
  status: 'inactive' | 'active' | 'expired' | 'cancelled';
  activated_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export function useSubscription() {
  const { user } = useAuth();

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['user-subscription', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) {
        console.error('subscription fetch error', error.message);
        return null;
      }
      return data as Subscription | null;
    },
    enabled: !!user,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const notExpired = !subscription?.expires_at || new Date(subscription.expires_at) > new Date();
  const paidPlans: PlanType[] = ['monthly', 'yearly', 'yearly_plus', 'lifetime'];
  const hasActiveSubscription =
    subscription?.status === 'active' &&
    paidPlans.includes((subscription?.plan_type ?? 'none') as PlanType) &&
    notExpired;

  const isSubscriptionExpired =
    subscription?.status === 'expired' ||
    (subscription?.status === 'active' && !notExpired);

  // Kept for backwards compat with existing components
  const hasPendingRequest = false;
  const isTrial = subscription?.plan_type === 'trial' && subscription?.status === 'active';

  return {
    subscription,
    hasActiveSubscription,
    isSubscriptionExpired,
    hasPendingRequest,
    isTrial,
    pendingRequest: null,
    trialDaysRemaining: null,
    isLoading,
  };
}
