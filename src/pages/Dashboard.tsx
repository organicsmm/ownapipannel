import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { supabase } from '@/integrations/supabase/client';
import { ShoppingCart, TrendingUp, Activity, Sparkles, Package, ChevronRight, Zap, Eye, Heart, MessageCircle, BarChart3, ArrowUpRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { PageMeta } from '@/components/seo/PageMeta';
import { SubscriptionTimeline } from '@/components/subscription/SubscriptionTimeline';
import { FirstProviderCTA } from '@/components/subscription/FirstProviderCTA';

export default function Dashboard() {
  const { user, wallet, profile } = useAuth();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();

  const { data: recentOrders } = useQuery({
    queryKey: ['recent-orders', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('orders').select('id, status, price, link, created_at, service:services(name, category)').eq('user_id', user?.id).order('created_at', { ascending: false }).limit(5);
      return data || [];
    },
    enabled: !!user?.id, staleTime: 30000, refetchOnWindowFocus: false,
  });

  const { data: engagementOrders } = useQuery({
    queryKey: ['recent-engagement-orders', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('engagement_orders').select('id, order_number, status, total_price, link, created_at, base_quantity, items:engagement_order_items(engagement_type, quantity, status)').eq('user_id', user?.id).order('created_at', { ascending: false }).limit(5);
      return data || [];
    },
    enabled: !!user?.id, staleTime: 30000, refetchOnWindowFocus: false,
  });

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats', user?.id],
    queryFn: async () => {
      const { data: orders } = await supabase.from('orders').select('status, price').eq('user_id', user?.id).limit(1000);
      const { data: engOrders } = await supabase.from('engagement_orders').select('status, total_price').eq('user_id', user?.id).limit(1000);
      const totalOrders = (orders?.length || 0) + (engOrders?.length || 0);
      const completedOrders = (orders?.filter(o => o.status === 'completed').length || 0) + (engOrders?.filter(o => o.status === 'completed').length || 0);
      const activeOrders = (orders?.filter(o => ['processing','pending'].includes(o.status || '')).length || 0) + (engOrders?.filter(o => ['processing','pending'].includes(o.status || '')).length || 0);
      const totalSpent = (orders?.reduce((s, o) => s + Number(o.price), 0) || 0) + (engOrders?.reduce((s, o) => s + Number(o.total_price), 0) || 0);
      return { totalOrders, completedOrders, activeOrders, totalSpent };
    },
    enabled: !!user?.id, staleTime: 60000, refetchOnWindowFocus: false,
  });

  const typeIcon: Record<string, any> = { views: Eye, likes: Heart, comments: MessageCircle };

  const statusChip = (status: string) => {
    const map: Record<string, string> = {
      completed: 'border-primary/30 text-primary bg-primary/5',
      processing: 'border-border text-foreground bg-secondary',
      pending: 'border-border text-muted-foreground bg-secondary/50',
      failed: 'border-destructive/30 text-destructive bg-destructive/10',
      paused: 'border-border text-muted-foreground bg-secondary/50',
    };
    return map[status] || 'border-border text-muted-foreground bg-secondary/50';
  };

  return (
    <DashboardLayout>
      <PageMeta title="Dashboard" description="Manage your social media growth orders." noIndex />
      <div className="space-y-5 sm:space-y-7">

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-b border-border pb-5">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary mb-2">
              :good_{new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl leading-[1] tracking-tight text-foreground">
              Dashboard<span className="text-primary italic">.</span>
            </h1>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground mt-2">
              Welcome back, {profile?.full_name || 'User'}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate('/engagement-order')}
              className="h-10 px-4 rounded-md border border-border bg-card text-foreground font-mono text-[10px] uppercase tracking-[0.18em] flex items-center gap-2 hover:border-primary/50 transition-colors">
              <Sparkles className="w-3.5 h-3.5 text-primary" /> engagement
            </button>
            <button onClick={() => navigate('/order')}
              className="h-10 px-4 rounded-md bg-primary text-primary-foreground font-mono text-[10px] uppercase tracking-[0.18em] flex items-center gap-2 hover:shadow-[0_15px_40px_-15px_hsl(var(--primary)/0.6)] transition-all">
              <Zap className="w-3.5 h-3.5" /> new order
            </button>
          </div>
        </div>

        {/* Subscription activation timeline */}
        <SubscriptionTimeline />

        {/* First-provider / first-bundle onboarding CTA (subscribed users) */}

        {/* First-provider / first-bundle onboarding CTA (subscribed users) */}
        <FirstProviderCTA />


        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">

          {[
            { icon: ShoppingCart, label: 'Total Orders', value: stats?.totalOrders || 0, sub: `${stats?.completedOrders || 0} completed` },
            { icon: Activity, label: 'Active', value: stats?.activeOrders || 0, sub: 'In progress' },
            { icon: TrendingUp, label: 'Total Spent', value: formatPrice(stats?.totalSpent || 0), sub: 'All time' },
          ].map((s, i) => (
            <div key={i} className="rounded-md bg-card border border-border p-4 sm:p-5 relative overflow-hidden group hover:border-primary/30 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="w-8 h-8 rounded-md border border-border bg-background flex items-center justify-center text-primary">
                  <s.icon className="w-3.5 h-3.5" />
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">:0{i+1}</span>
              </div>
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-2">{s.label}</p>
              <p className="font-serif text-2xl sm:text-3xl tracking-tight text-foreground leading-none">{s.value}</p>
              <p className="text-[11px] text-muted-foreground mt-2">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 rounded-md bg-card border border-border overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-3.5 h-3.5 text-primary" />
                <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-foreground">:engagement_orders</h2>
              </div>
              <Link to="/engagement-orders" className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary hover:underline flex items-center gap-0.5">
                view all <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div>
              {engagementOrders && engagementOrders.length > 0 ? engagementOrders.slice(0, 4).map((order: any) => (
                <Link key={order.id} to={`/engagement-orders/${order.order_number}`}
                  className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-secondary/40 border-b border-border last:border-b-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-md border border-border bg-background flex items-center justify-center font-mono text-[10px] text-muted-foreground shrink-0">#{order.order_number}</div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium truncate max-w-[200px] text-foreground">{order.link?.replace('https://', '').slice(0, 35)}...</p>
                      <div className="flex items-center gap-3 mt-1">
                        {order.items?.slice(0, 3).map((item: any, idx: number) => {
                          const Icon = typeIcon[item.engagement_type] || Eye;
                          return <span key={idx} className="text-[11px] flex items-center gap-1 text-muted-foreground"><Icon className="w-3 h-3" />{item.quantity?.toLocaleString()}</span>;
                        })}
                      </div>
                    </div>
                  </div>
                  <span className={`font-mono text-[9px] uppercase tracking-[0.15em] px-2 py-1 rounded border ${statusChip(order.status)}`}>{order.status}</span>
                </Link>
              )) : (
                <div className="px-5 py-12 text-center">
                  <p className="text-[12px] mb-4 text-muted-foreground font-mono uppercase tracking-[0.15em]">:no_engagement_orders_yet</p>
                  <button onClick={() => navigate('/engagement-order')} className="font-mono text-[10px] uppercase tracking-[0.18em] px-4 py-2.5 rounded-md bg-primary text-primary-foreground">create first order →</button>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 rounded-md bg-card border border-border overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Package className="w-3.5 h-3.5 text-primary" />
                <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-foreground">:single_orders</h2>
              </div>
              <Link to="/orders" className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary hover:underline flex items-center gap-0.5">
                view all <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div>
              {recentOrders && recentOrders.length > 0 ? recentOrders.slice(0, 4).map((order: any) => (
                <div key={order.id} className="flex items-center justify-between px-5 py-4 border-b border-border last:border-b-0">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium truncate max-w-[150px] text-foreground">{order.service?.name || 'Service'}</p>
                    <p className="text-[11px] mt-0.5 text-muted-foreground">{formatPrice(Number(order.price))}</p>
                  </div>
                  <span className={`font-mono text-[9px] uppercase tracking-[0.15em] px-2 py-1 rounded border ${statusChip(order.status)}`}>{order.status}</span>
                </div>
              )) : (
                <div className="px-5 py-12 text-center">
                  <p className="text-[12px] mb-4 text-muted-foreground font-mono uppercase tracking-[0.15em]">:no_orders_yet</p>
                  <button onClick={() => navigate('/order')} className="font-mono text-[10px] uppercase tracking-[0.18em] px-4 py-2.5 rounded-md bg-primary text-primary-foreground">place order →</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { icon: Sparkles, label: 'Full Engagement', desc: 'Views + Likes + Comments', path: '/engagement-order' },
            { icon: Package, label: 'All Services', desc: 'Browse catalog', path: '/services' },
          ].map((a, i) => (
            <Link key={i} to={a.path} className="group flex items-center gap-3.5 p-4 rounded-md bg-card border border-border hover:border-primary/40 hover:bg-secondary/30 transition-all">
              <div className="w-10 h-10 rounded-md border border-border bg-background flex items-center justify-center text-primary shrink-0">
                <a.icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-foreground">{a.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{a.desc}</p>
              </div>
              <ArrowUpRight className="w-4 h-4 shrink-0 text-muted-foreground group-hover:text-primary group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all" />
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
