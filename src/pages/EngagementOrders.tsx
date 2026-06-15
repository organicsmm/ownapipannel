import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { 
  Loader2, 
  ExternalLink, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Play,
  RefreshCw,
  Eye,
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  ChevronRight,
  Zap,
  Timer,
  Search,
  X,
  BarChart3,
  Trash2
} from "lucide-react";


const ENGAGEMENT_ICONS = {
  views: Eye,
  likes: Heart,
  comments: MessageCircle,
  saves: Bookmark,
  shares: Share2,
};

const STATUS_CONFIG = {
  pending: { color: "bg-secondary text-foreground border border-border", icon: Clock },
  processing: { color: "bg-foreground text-background", icon: Play },
  completed: { color: "bg-secondary text-foreground border border-border", icon: CheckCircle2 },
  partial: { color: "bg-secondary text-foreground border border-border", icon: RefreshCw },
  failed: { color: "bg-secondary text-foreground border border-border", icon: XCircle },
  started: { color: "bg-foreground text-background", icon: Play },
};

export default function EngagementOrders() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { formatPrice } = useCurrency();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fast aggregated load — server-side summary RPC (no nested run fetches)
  const { data: orders, refetch } = useQuery({
    queryKey: ['engagement-orders', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.rpc('get_user_engagement_orders_list', { _limit: 100 });
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!user,
    staleTime: 15000,
    refetchOnWindowFocus: false,
    refetchInterval: 15000,
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setSelectMode(false);
  };

  const selectAllVisible = (ids: string[]) => {
    setSelectedIds(new Set(ids));
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.rpc('user_cancel_and_delete_engagement_orders' as any, {
        _order_ids: Array.from(selectedIds),
      });
      if (error) throw error;
      const count = (data as any)?.deleted_orders ?? selectedIds.size;
      toast.success(`${count} order${count !== 1 ? 's' : ''} cancelled & deleted`);
      clearSelection();
      setConfirmOpen(false);
      await refetch();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete orders');
    } finally {
      setDeleting(false);
    }
  };


  // Filter orders based on search query
  const filteredOrders = useMemo(() => {
    if (!orders || !searchQuery.trim()) return orders;
    
    const query = searchQuery.toLowerCase().trim();
    return orders.filter(order => 
      order.order_number?.toString().includes(query) ||
      order.link?.toLowerCase().includes(query)
    );
  }, [orders, searchQuery]);

  // INSTANT RENDER - no loading state
  if (!user && !authLoading) {
    navigate('/auth');
    return null;
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-6 w-6 text-primary" /> Engagement Orders</h1>
            <p className="text-muted-foreground">Track your full engagement deliveries in real-time</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => navigate('/engagement-order')}>
              + New Order
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by order number or video link..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Search Results Info */}
        {searchQuery && (
          <p className="text-sm text-muted-foreground">
            {filteredOrders?.length || 0} result{filteredOrders?.length !== 1 ? 's' : ''} found for "{searchQuery}"
          </p>
        )}

        {/* Orders List */}
        {orders?.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground mb-4">No engagement orders yet</p>
            <Button onClick={() => navigate('/engagement-order')}>
              Place Your First Order
            </Button>
          </Card>
        ) : filteredOrders?.length === 0 ? (
          <Card className="p-12 text-center">
            <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground mb-2">No orders found for "{searchQuery}"</p>
            <p className="text-sm text-muted-foreground mb-4">Try searching with order number or video link</p>
            <Button variant="outline" onClick={() => setSearchQuery("")}>
              Clear Search
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredOrders?.map((order) => (
              <OrderCard key={order.id} order={order} onClick={() => navigate(`/engagement-orders/${order.order_number}`)} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function OrderCard({ order, onClick }: { order: any; onClick: () => void }) {
  const { formatPrice } = useCurrency();
  const StatusIcon = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG]?.icon || Clock;
  const statusColor = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG]?.color || "";

  // Aggregates already precomputed server-side by get_user_engagement_orders_list
  const items = order.items || [];
  const totalRuns      = items.reduce((s: number, it: any) => s + (it.total_runs || 0), 0);
  const completedRuns  = items.reduce((s: number, it: any) => s + (it.completed_runs || 0), 0);
  const activeRuns     = items.reduce((s: number, it: any) => s + (it.started_runs || 0), 0);
  const totalDelivered = items.reduce((s: number, it: any) => s + (it.delivered || 0), 0);
  const totalQuantity  = items.reduce((s: number, it: any) => s + (it.quantity || 0), 0);
  const progressPercent = totalRuns > 0 ? (completedRuns / totalRuns) * 100 : 0;

  // Earliest pending across items
  const nextPendingAt = items
    .map((it: any) => it.next_pending_at)
    .filter(Boolean)
    .sort()[0];
  const nextRun = nextPendingAt ? { scheduled_at: nextPendingAt } : null;

  return (
    <Card 
      className="glass-card overflow-hidden cursor-pointer hover:border-muted-foreground/50 transition-all"
      onClick={onClick}
    >
      <CardHeader className="pb-3 border-b border-border">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <CardTitle className="text-lg text-foreground">Order #{order.order_number}</CardTitle>
              <Badge className={statusColor}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {order.status}
              </Badge>
              {order.is_organic_mode && (
                <Badge variant="outline" className="border-border text-muted-foreground">
                  🌱 Organic
                </Badge>
              )}
            </div>
            <a 
              href={order.link} 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              {order.link.length > 50 ? order.link.slice(0, 50) + '...' : order.link}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="text-right flex items-center gap-2">
            <div>
              <p className="font-semibold text-foreground">{formatPrice(order.total_price || 0)}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Real-time Stats */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="p-3 bg-secondary rounded-xl border border-border">
            <Zap className="h-4 w-4 mx-auto mb-1 text-foreground" />
            <p className="text-sm font-bold text-foreground">{totalDelivered.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Delivered</p>
          </div>
          <div className="p-3 bg-secondary rounded-xl border border-border">
            <CheckCircle2 className="h-4 w-4 mx-auto mb-1 text-foreground" />
            <p className="text-sm font-bold text-foreground">{completedRuns}</p>
            <p className="text-[10px] text-muted-foreground">Complete</p>
          </div>
          <div className="p-3 bg-secondary rounded-xl border border-border">
            <Clock className="h-4 w-4 mx-auto mb-1 text-foreground" />
            <p className="text-sm font-bold text-foreground">{items.reduce((s: number, it: any) => s + (it.pending_runs || 0), 0)}</p>
            <p className="text-[10px] text-muted-foreground">Pending</p>
          </div>
          <div className="p-3 bg-secondary rounded-xl border border-border">
            <Play className="h-4 w-4 mx-auto mb-1 text-foreground" />
            <p className="text-sm font-bold text-foreground">{activeRuns}</p>
            <p className="text-[10px] text-muted-foreground">Active</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{completedRuns} / {totalRuns} runs</span>
            <span>{totalDelivered.toLocaleString()} / {totalQuantity.toLocaleString()}</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Next Run Timer */}
        {nextRun && (
          <div className="flex items-center gap-2 p-3 bg-secondary rounded-xl border border-border text-sm">
            <Timer className="h-4 w-4 text-foreground" />
            <span className="text-muted-foreground">Next run:</span>
            <strong className="text-foreground">{format(new Date(nextRun.scheduled_at), 'HH:mm')}</strong>
            <span className="text-muted-foreground">
              ({formatDistanceToNow(new Date(nextRun.scheduled_at), { addSuffix: true })})
            </span>
          </div>
        )}

        {/* Engagement Items */}
        <div className="flex flex-wrap gap-2">
          {order.items?.map((item: any) => {
            const Icon = ENGAGEMENT_ICONS[item.engagement_type as keyof typeof ENGAGEMENT_ICONS] || Eye;
            const itemCompleted = item.completed_runs || 0;
            const itemTotalRuns = item.total_runs || 0;
            const itemDelivered = item.delivered || 0;

            return (
              <Badge 
                key={item.id}
                variant="secondary"
                className="flex items-center gap-1.5 py-1.5 px-3"
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="capitalize">{item.engagement_type}:</span>
                <span className="font-mono">{itemDelivered.toLocaleString()}/{item.quantity.toLocaleString()}</span>
                <span className="text-muted-foreground">({itemCompleted}/{itemTotalRuns})</span>
              </Badge>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}