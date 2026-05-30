import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Users,
  ShoppingCart,
  DollarSign,
  Package,
  TrendingUp,
  Activity,
  Zap,
  AlertTriangle,
  ArrowUpRight,
  Sparkles,
  LayoutDashboard,
  Clock,
  CreditCard,
  MessageCircle,
  Globe,
  Loader2,
} from 'lucide-react';

import { Link, Navigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function Admin() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceLoaded, setMaintenanceLoaded] = useState(false);

  // Optimized Dashboard Stats fetch
  const { data: dashboardStats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_admin_dashboard_stats' as any);
      if (error) throw error;
      return data as any;
    },
  });

  useEffect(() => {
    if (dashboardStats && !maintenanceLoaded) {
      setMaintenanceMode(Boolean(dashboardStats.maintenance_mode));
      setMaintenanceLoaded(true);
    }
  }, [dashboardStats, maintenanceLoaded]);


  // Maintenance mode toggle mutation
  const toggleMaintenanceMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { data: existing } = await supabase.from('platform_settings').select('id').limit(1).maybeSingle();
      if (!existing) throw new Error('No platform settings found');
      const { error } = await supabase
        .from('platform_settings')
        .update({ maintenance_mode: enabled, updated_at: new Date().toISOString() } as any)
        .eq('id', existing.id);
      if (error) throw error;
    },
    onSuccess: (_, enabled) => {
      toast.success(enabled ? 'Maintenance mode enabled' : 'Maintenance mode disabled');
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // INSTANT RENDER - No blocking loader, redirect in useEffect if needed

  const totalRevenue = dashboardStats?.total_revenue || 0;
  const totalOrders = dashboardStats?.total_orders || 0;
  const userCount = dashboardStats?.user_count || 0;
  const serviceCount = dashboardStats?.service_count || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6 px-2 sm:px-4 lg:px-6 pb-8">
        {/* Hero Header */}
        <div className="relative overflow-hidden glass-card p-6 sm:p-8 bg-gradient-to-br from-primary/10 via-transparent to-accent/10">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-xl shadow-primary/20">
                <LayoutDashboard className="h-7 w-7 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                  Admin Control Center
                </h1>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Complete platform management
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-success/10 text-success border-success/30 gap-1">
                <Activity className="h-3 w-3" />
                System Online
              </Badge>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-60 h-60 bg-gradient-to-bl from-primary/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-accent/20 to-transparent rounded-full blur-3xl" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="glass-card relative overflow-hidden group hover:border-primary/30 transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-foreground/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-4 sm:p-6 relative">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-2xl bg-foreground flex items-center justify-center shadow-lg shadow-foreground/20">
                  <Users className="h-6 w-6 text-background" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-foreground" />
              </div>
              <p className="text-3xl sm:text-4xl font-bold">{userCount || 0}</p>
              <p className="text-sm text-muted-foreground">Total Users</p>
            </CardContent>
          </Card>

          <Card className="glass-card relative overflow-hidden group hover:border-primary/30 transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-foreground/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-4 sm:p-6 relative">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-2xl bg-foreground/90 flex items-center justify-center shadow-lg shadow-foreground/20">
                  <ShoppingCart className="h-6 w-6 text-background" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-foreground" />
              </div>
              <p className="text-3xl sm:text-4xl font-bold">{totalOrders}</p>
              <p className="text-sm text-muted-foreground">Total Orders</p>
            </CardContent>
          </Card>

          <Card className="glass-card relative overflow-hidden group hover:border-primary/30 transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-foreground/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-4 sm:p-6 relative">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-2xl bg-foreground/80 flex items-center justify-center shadow-lg shadow-foreground/20">
                  <DollarSign className="h-6 w-6 text-background" />
                </div>
                <TrendingUp className="h-4 w-4 text-foreground" />
              </div>
              <p className="text-3xl sm:text-4xl font-bold">${totalRevenue.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
            </CardContent>
          </Card>

          <Card className="glass-card relative overflow-hidden group hover:border-primary/30 transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-foreground/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-4 sm:p-6 relative">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-2xl bg-foreground/70 flex items-center justify-center shadow-lg shadow-foreground/20">
                  <Package className="h-6 w-6 text-background" />
                </div>
                <Zap className="h-4 w-4 text-foreground" />
              </div>
              <p className="text-3xl sm:text-4xl font-bold">{serviceCount || 0}</p>
              <p className="text-sm text-muted-foreground">Active Services</p>
            </CardContent>
          </Card>
        </div>

        {/* Global markup system REMOVED — admin sets the final per-1K price
            directly on each service in Admin → Services. Real-time updates. */}

        {/* Maintenance Mode Toggle */}
        <Card className={`glass-card border-2 relative overflow-hidden transition-all ${maintenanceMode ? 'border-destructive/50 bg-destructive/5' : 'border-border'}`}>
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-4 flex-1">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl shrink-0 transition-colors ${maintenanceMode ? 'bg-gradient-to-br from-destructive to-destructive/60 shadow-destructive/20' : 'bg-gradient-to-br from-muted to-muted/60 shadow-muted/20'}`}>
                  <AlertTriangle className={`h-7 w-7 ${maintenanceMode ? 'text-destructive-foreground' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Maintenance Mode</h3>
                  <p className="text-sm text-muted-foreground">
                    {maintenanceMode
                      ? 'Site is currently in maintenance — users see a waiting page'
                      : 'Turn on to show a maintenance page to all users while you update'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-medium ${maintenanceMode ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {maintenanceMode ? 'ON' : 'OFF'}
                </span>
                <Switch
                  checked={maintenanceMode}
                  onCheckedChange={(checked) => {
                    setMaintenanceMode(checked);
                    toggleMaintenanceMutation.mutate(checked);
                  }}
                  disabled={toggleMaintenanceMutation.isPending}
                />
              </div>
            </div>
          </CardContent>
        </Card>


        {/* Quick Access Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/admin/users">
            <Card className="glass-card h-full hover:border-accent/50 hover:shadow-lg hover:shadow-accent/10 transition-all cursor-pointer group">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Users className="h-6 w-6 text-accent" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold group-hover:text-accent transition-colors">
                      Users
                    </h3>
                    <p className="text-xs text-muted-foreground">Manage accounts</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/cron-monitor">
            <Card className="glass-card h-full hover:border-warning/50 hover:shadow-lg hover:shadow-warning/10 transition-all cursor-pointer group">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-warning/20 to-warning/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Clock className="h-6 w-6 text-warning" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold group-hover:text-warning transition-colors">
                        Cron Monitor
                      </h3>
                      <Badge className="text-[10px] h-4 px-1.5 bg-warning text-warning-foreground">LIVE</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Real-time status</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-warning transition-colors" />
                </div>
              </CardContent>
            </Card>
          </Link>


          <Link to="/admin/chat">
            <Card className="glass-card h-full hover:border-success/50 hover:shadow-lg hover:shadow-success/10 transition-all cursor-pointer group border-2 border-success/30">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-success/30 to-success/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <MessageCircle className="h-6 w-6 text-success" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold group-hover:text-success transition-colors">
                        Live Chat
                      </h3>
                      <Badge className="text-[10px] h-4 px-1.5 bg-success text-success-foreground">LIVE</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Support messages</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-success transition-colors" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/provider-accounts">
            <Card className="glass-card h-full hover:border-accent/50 hover:shadow-lg hover:shadow-accent/10 transition-all cursor-pointer group border-2 border-accent/30">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent/30 to-accent/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Globe className="h-6 w-6 text-accent" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold group-hover:text-accent transition-colors">
                        Provider Accounts
                      </h3>
                      <Badge className="text-[10px] h-4 px-1.5 bg-accent text-accent-foreground">NEW</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">API keys & URLs</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/service-provider-mapping">
            <Card className="glass-card h-full hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all cursor-pointer group border-2 border-primary/30">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold group-hover:text-primary transition-colors">
                        Service Mapping
                      </h3>
                      <Badge className="text-[10px] h-4 px-1.5 bg-primary">NEW</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Failover & Rotation</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/deposits">
            <Card className="glass-card h-full hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10 transition-all cursor-pointer group border-2 border-amber-500/30">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/30 to-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <CreditCard className="h-6 w-6 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold group-hover:text-amber-500 transition-colors">
                        Deposit Requests
                      </h3>
                      <Badge className="text-[10px] h-4 px-1.5 bg-amber-500 text-amber-500-foreground">PENDING</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Approve Razorpay payments</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-amber-500 transition-colors" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/subscriptions">
            <Card className="glass-card h-full hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all cursor-pointer group border-2 border-primary/30">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <CreditCard className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold group-hover:text-primary transition-colors">
                      Subscriptions
                    </h3>
                    <p className="text-xs text-muted-foreground">Add / manage user plans</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
