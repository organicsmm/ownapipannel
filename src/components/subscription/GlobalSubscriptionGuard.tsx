import { useMemo, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useMaintenanceMode } from '@/hooks/useMaintenanceMode';
import { MaintenancePage } from '@/components/MaintenanceMode';
import { SubscriptionCheckDialog } from './SubscriptionCheckDialog';

interface Props { children: React.ReactNode }

// Routes that never require a subscription
const ALLOWED_ROUTES = [
  '/', '/auth', '/wallet', '/settings', '/subscription/return', '/security-test',
  '/terms', '/privacy', '/refund', '/cookies',
];

const isAllowed = (path: string) =>
  ALLOWED_ROUTES.some((r) => path === r || path.startsWith(r + '/')) ||
  path.startsWith('/admin');

export function GlobalSubscriptionGuard({ children }: Props) {
  const location = useLocation();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const { hasActiveSubscription, isLoading: subLoading } = useSubscription();
  const { isMaintenanceMode } = useMaintenanceMode();
  const [dialogOpen, setDialogOpen] = useState(false);

  const allowedPath = useMemo(() => isAllowed(location.pathname), [location.pathname]);

  const needsSubscription =
    !!user && !isAdmin && !authLoading && !subLoading &&
    !hasActiveSubscription && !allowedPath;

  useEffect(() => {
    setDialogOpen(needsSubscription);
  }, [needsSubscription]);

  if (isMaintenanceMode && !isAdmin && !location.pathname.startsWith('/admin') && !allowedPath) {
    return <MaintenancePage />;
  }

  return (
    <>
      {children}
      <SubscriptionCheckDialog
        open={dialogOpen}
        onOpenChange={(o) => { if (!o && needsSubscription) return; setDialogOpen(o); }}
      />
    </>
  );
}
