
-- Fix 1: Tighten transactions INSERT — require positive, capped amount
DROP POLICY IF EXISTS "Users create own deposit transactions" ON public.transactions;
CREATE POLICY "Users create own deposit transactions"
ON public.transactions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND type = 'deposit'
  AND status = 'pending'
  AND amount > 0
  AND amount <= 100000
);

-- Fix 2: Revoke EXECUTE from anon/authenticated on functions that should NOT be callable via Data API
-- Trigger functions (only invoked by triggers, never directly)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_user_subscription() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_conversation_last_message() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_engagement_order_completed_at() FROM anon, authenticated, PUBLIC;

-- Maintenance/cleanup function — only service role / cron should call
REVOKE EXECUTE ON FUNCTION public.cleanup_old_completed_engagement_orders() FROM anon, authenticated, PUBLIC;
