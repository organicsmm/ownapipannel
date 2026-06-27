import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

type State = "verifying" | "success" | "failed" | "pending";

export default function SubscriptionReturn() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const orderId = params.get("order_id");
  const initialStatus = params.get("status");
  const [state, setState] = useState<State>("verifying");
  const [planType, setPlanType] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate(`/auth?redirect=/subscription/return?order_id=${orderId}&status=${initialStatus}`);
      return;
    }
    if (!orderId) {
      setState("failed");
      return;
    }

    let attempts = 0;
    let cancelled = false;

    const tick = async () => {
      attempts += 1;
      try {
        const { data, error } = await supabase.functions.invoke(
          "zapupi-sync-subscription",
          { body: { order_id: orderId } }
        );
        if (error) throw new Error(error.message);
        const s = (data as any)?.status;
        if (s === "success") {
          if (cancelled) return;
          setPlanType((data as any).plan_type || null);
          setState("success");
          toast.success("✅ Subscription Activated!");
          return;
        }
        if (s === "failed") {
          if (cancelled) return;
          setState("failed");
          toast.error("❌ Payment Failed");
          return;
        }
        if (attempts < 8) {
          setTimeout(tick, 2500);
        } else {
          setState("pending");
        }
      } catch (e: any) {
        if (attempts < 4) setTimeout(tick, 3000);
        else setState("failed");
      }
    };

    tick();
    return () => { cancelled = true; };
  }, [authLoading, user, orderId, initialStatus, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-md w-full p-8 text-center glass-card">
        {state === "verifying" && (
          <>
            <Loader2 className="h-14 w-14 text-primary animate-spin mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Verifying payment…</h1>
            <p className="text-muted-foreground text-sm">Hold tight, this takes a few seconds.</p>
          </>
        )}
        {state === "success" && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-9 w-9 text-emerald-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Subscription Activated</h1>
            <p className="text-muted-foreground text-sm mb-6">
              Your <span className="font-semibold capitalize">{planType || "plan"}</span> is now active.
            </p>
            <Button className="w-full btn-gradient" onClick={() => navigate("/dashboard")}>
              Go to Dashboard
            </Button>
          </>
        )}
        {state === "failed" && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="h-9 w-9 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Payment Failed</h1>
            <p className="text-muted-foreground text-sm mb-6">
              We couldn't confirm your payment. If money was deducted it will auto-refund within 24 hours.
            </p>
            <Button className="w-full btn-gradient" onClick={() => navigate("/dashboard")}>
              Try Again
            </Button>
          </>
        )}
        {state === "pending" && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Clock className="h-9 w-9 text-amber-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Payment Pending</h1>
            <p className="text-muted-foreground text-sm mb-6">
              Bank confirmation is taking longer than usual. Your plan will activate automatically once confirmed.
            </p>
            <Button className="w-full" variant="outline" onClick={() => navigate("/dashboard")}>
              Go to Dashboard
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
