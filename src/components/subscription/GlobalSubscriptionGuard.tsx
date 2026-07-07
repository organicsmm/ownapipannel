import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMaintenanceMode } from '@/hooks/useMaintenanceMode';
import { MaintenancePage } from '@/components/MaintenanceMode';

interface Props { children: React.ReactNode }

/**
 * Global guard is now only responsible for maintenance-mode blocking.
 * Subscription gating is handled per-route via <SubscriptionGuard>, so users
 * without a subscription can still sign in and browse Dashboard / Orders /
 * Support / Settings freely. Pro features (Providers, Bundles, Engagement,
 * Mass Order, single Order) remain wrapped individually.
 */
export function GlobalSubscriptionGuard({ children }: Props) {
  const location = useLocation();
  const { isAdmin } = useAuth();
  const { isMaintenanceMode } = useMaintenanceMode();

  if (
    isMaintenanceMode &&
    !isAdmin &&
    !location.pathname.startsWith('/admin') &&
    location.pathname !== '/' &&
    location.pathname !== '/auth'
  ) {
    return <MaintenancePage />;
  }

  return <>{children}</>;
}

