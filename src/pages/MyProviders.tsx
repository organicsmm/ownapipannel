import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SubscriptionGuard } from "@/components/subscription/SubscriptionGuard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, RefreshCw, Trash2, KeyRound, Loader2 } from "lucide-react";

export default function MyProviders() {
  return (
    <SubscriptionGuard>
      <DashboardLayout>
        <MyProvidersInner />
      </DashboardLayout>
    </SubscriptionGuard>
  );
}

function MyProvidersInner() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", api_url: "", api_key: "" });
  const [checking, setChecking] = useState<string | null>(null);

  const { data: accounts, isLoading } = useQuery({
    queryKey: ["user-providers", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_provider_accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("user_provider_accounts").insert({
        user_id: user.id,
        name: form.name.trim(),
        api_url: form.api_url.trim(),
        api_key: form.api_key.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Provider added");
      setForm({ name: "", api_url: "", api_key: "" });
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ["user-providers"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("user_provider_accounts").delete().eq("id", id).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Provider removed");
      qc.invalidateQueries({ queryKey: ["user-providers"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const checkBalance = async (id: string) => {
    setChecking(id);
    try {
      const { data, error } = await supabase.functions.invoke("user-check-balance", { body: { providerAccountId: id } });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast.success(`Balance: ${data.balance} ${data.currency}`);
      qc.invalidateQueries({ queryKey: ["user-providers"] });
    } catch (e: any) {
      toast.error(e.message || "Balance check failed");
    } finally {
      setChecking(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Provider Accounts</h1>
          <p className="text-sm text-muted-foreground mt-1">Apne SMM provider ke API keys add karo. Tumhare orders inhi se chalenge.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-2" /> Add Provider
        </Button>
      </div>

      {showForm && (
        <Card className="p-6 space-y-4">
          <div>
            <Label>Display Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. My SMM Panel" />
          </div>
          <div>
            <Label>API URL</Label>
            <Input value={form.api_url} onChange={(e) => setForm({ ...form, api_url: e.target.value })} placeholder="https://provider.com/api/v2" />
          </div>
          <div>
            <Label>API Key</Label>
            <Input type="password" value={form.api_key} onChange={(e) => setForm({ ...form, api_key: e.target.value })} placeholder="Your API key" />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => addMutation.mutate()} disabled={!form.name || !form.api_url || !form.api_key || addMutation.isPending}>
              {addMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Provider
            </Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : accounts && accounts.length > 0 ? (
        <div className="grid gap-4">
          {accounts.map((acc: any) => (
            <Card key={acc.id} className="p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <KeyRound className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{acc.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{acc.api_url}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Balance: <span className="font-semibold text-foreground">{acc.balance != null ? `${acc.balance} ${acc.balance_currency || ""}` : "Not checked"}</span>
                    </p>
                    {acc.last_balance_error && <p className="text-xs text-destructive mt-1">⚠ {acc.last_balance_error}</p>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => checkBalance(acc.id)} disabled={checking === acc.id}>
                    {checking === acc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    <span className="ml-1.5">Check Balance</span>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete this provider? Linked services will also be removed.")) deleteMutation.mutate(acc.id); }}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <KeyRound className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Abhi koi provider nahi hai. Add Provider button se shuru karo.</p>
        </Card>
      )}
    </div>
  );
}
