// Shared: server-side entitlement check. Any paid feature edge function
// MUST call this before doing work. Never trust the client's view.
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function assertActiveSubscription(admin: SupabaseClient, userId: string) {
  const { data, error } = await admin.rpc("has_active_subscription", { _user_id: userId });
  if (error) throw new Error("Subscription check failed");
  if (!data) throw new Error("Active subscription required");
  return true;
}
