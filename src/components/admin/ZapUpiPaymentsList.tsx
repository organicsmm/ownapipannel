import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Zap, CheckCircle2, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";

export function ZapUpiPaymentsList() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-zapupi-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("zapupi_subscription_payments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="p-10 text-center glass-card">
        <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No auto payments yet</p>
      </Card>
    );
  }

  return (
    <Card className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Order ID</th>
              <th className="px-4 py-3 text-left">Plan</th>
              <th className="px-4 py-3 text-right">Amount (₹)</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">UTR / Txn</th>
              <th className="px-4 py-3 text-left">Created</th>
            </tr>
          </thead>
          <tbody>
            {data.map((p: any) => (
              <tr key={p.id} className="border-t border-border/40 hover:bg-muted/20">
                <td className="px-4 py-3 font-mono text-xs">{p.order_id}</td>
                <td className="px-4 py-3 capitalize">{p.plan_type}</td>
                <td className="px-4 py-3 text-right font-semibold">₹{Number(p.amount_inr).toFixed(2)}</td>
                <td className="px-4 py-3">
                  {p.status === "success" ? (
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Success
                    </Badge>
                  ) : p.status === "failed" ? (
                    <Badge variant="destructive" className="gap-1">
                      <XCircle className="h-3 w-3" /> Failed
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1">
                      <Clock className="h-3 w-3" /> Pending
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  {p.utr || p.txn_id || <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {format(new Date(p.created_at), "dd MMM, HH:mm")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
