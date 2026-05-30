import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Settings2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  itemId: string;
  engagementType: string;
  serviceName?: string | null;
}

type Row = {
  user_provider_account_id: string;
  provider_service_id: string;
  priority: number;
  enabled: boolean;
};

export function UserProviderRotationDialog({ open, onOpenChange, itemId, engagementType, serviceName }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [rows, setRows] = useState<Record<string, Row>>({});

  const { data: providers, isLoading: provLoading } = useQuery({
    queryKey: ["user-providers-active", user?.id],
    enabled: !!user && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_provider_accounts")
        .select("id, name, is_active")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: existing, isLoading: exLoading } = useQuery({
    queryKey: ["item-providers", itemId],
    enabled: !!itemId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_bundle_item_providers")
        .select("*")
        .eq("user_bundle_item_id", itemId)
        .order("priority");
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    if (!providers) return;
    const next: Record<string, Row> = {};
    providers.forEach((p, idx) => {
      const ex = existing?.find((e: any) => e.user_provider_account_id === p.id);
      next[p.id] = {
        user_provider_account_id: p.id,
        provider_service_id: ex?.provider_service_id || "",
        priority: ex?.priority ?? idx + 1,
        enabled: !!ex && ex.is_active !== false,
      };
    });
    setRows(next);
  }, [providers, existing, open]);

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const enabledRows = Object.values(rows).filter(r => r.enabled);
      if (enabledRows.length === 0) throw new Error("Kam se kam ek provider tick karo");
      for (const r of enabledRows) {
        if (!r.provider_service_id.trim()) throw new Error("Sabhi ticked providers ka Service ID enter karo");
      }
      // Wipe and re-insert (simpler than diff)
      const { error: delErr } = await supabase
        .from("user_bundle_item_providers")
        .delete()
        .eq("user_bundle_item_id", itemId);
      if (delErr) throw delErr;

      const payload = enabledRows.map(r => ({
        user_id: user.id,
        user_bundle_item_id: itemId,
        user_provider_account_id: r.user_provider_account_id,
        provider_service_id: r.provider_service_id.trim(),
        priority: Number(r.priority) || 1,
        is_active: true,
      }));
      const { error: insErr } = await supabase.from("user_bundle_item_providers").insert(payload);
      if (insErr) throw insErr;

      // Also sync the primary (lowest priority) onto user_bundle_items for backwards compat
      const primary = [...enabledRows].sort((a, b) => a.priority - b.priority)[0];

      // Fetch service metadata (name, rate, min, max) for the primary so engagement order flow works
      let meta: { service_name?: string; rate?: number; min_qty?: number; max_qty?: number } = {};
      try {
        const { data: svcData, error: svcErr } = await supabase.functions.invoke("user-import-services", {
          body: { providerAccountId: primary.user_provider_account_id, service_ids: [primary.provider_service_id.trim()], fetch_only: true },
        });
        if (svcErr) {
          let realMsg = svcErr.message;
          try {
            const ctx: any = (svcErr as any).context;
            if (ctx && typeof ctx.json === "function") {
              const body = await ctx.json();
              if (body?.error) realMsg = body.error;
            }
          } catch {}
          throw new Error(realMsg);
        }
        const svc = (svcData as any)?.services?.[0];
        if (!svc) throw new Error(`Service ID "${primary.provider_service_id}" provider ki list me nahi mili.`);
        meta = { service_name: svc.name, rate: svc.rate, min_qty: svc.min, max_qty: svc.max };
      } catch (e: any) {
        throw new Error(`Primary provider ka service validate nahi hua: ${e.message}`);
      }

      const { error: updErr } = await supabase
        .from("user_bundle_items")
        .update({
          user_provider_account_id: primary.user_provider_account_id,
          provider_service_id: primary.provider_service_id.trim(),
          ...meta,
        })
        .eq("id", itemId);
      if (updErr) throw updErr;

    onSuccess: () => {
      toast.success("Provider rotation saved");
      qc.invalidateQueries({ queryKey: ["user-bundles"] });
      qc.invalidateQueries({ queryKey: ["item-providers", itemId] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message || "Save failed"),
  });

  const loading = provLoading || exLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" /> Provider Rotation
          </DialogTitle>
          <DialogDescription>
            Configure which of <b>your</b> provider accounts can fulfill "{(serviceName || engagementType).slice(0, 60)}"
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : !providers || providers.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Koi active provider account nahi hai. Pehle <a href="/my-providers" className="underline text-primary">My Providers</a> me add karo.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-[40px_1fr_140px_80px] gap-2 text-xs font-medium text-muted-foreground px-1">
              <div>Use</div>
              <div>Account</div>
              <div>Service ID</div>
              <div>Priority</div>
            </div>
            {providers.map(p => {
              const r = rows[p.id];
              if (!r) return null;
              return (
                <div key={p.id} className="grid grid-cols-[40px_1fr_140px_80px] gap-2 items-center bg-muted/30 rounded-md p-3">
                  <Checkbox
                    checked={r.enabled}
                    onCheckedChange={(v) => setRows(prev => ({ ...prev, [p.id]: { ...prev[p.id], enabled: !!v } }))}
                  />
                  <div className="min-w-0">
                    <div className="font-medium truncate">{p.name}</div>
                  </div>
                  <Input
                    placeholder="e.g. 146"
                    value={r.provider_service_id}
                    onChange={(e) => setRows(prev => ({ ...prev, [p.id]: { ...prev[p.id], provider_service_id: e.target.value } }))}
                    disabled={!r.enabled}
                  />
                  <Input
                    type="number"
                    min={1}
                    value={r.priority}
                    onChange={(e) => setRows(prev => ({ ...prev, [p.id]: { ...prev[p.id], priority: Number(e.target.value) || 1 } }))}
                    disabled={!r.enabled}
                  />
                </div>
              );
            })}
            <div className="text-xs text-muted-foreground bg-muted/30 rounded-md p-3">
              <b>Priority Order:</b> Lower number = checked first (1 = highest priority). Agar #1 fail ho ya balance kam ho to system #2 try karega, phir #3, etc.
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || loading || !providers?.length}>
            {save.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Mappings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
