DROP POLICY IF EXISTS "Active subscribers insert own provider accounts" ON public.user_provider_accounts;

CREATE POLICY "Active subscribers and admins insert own provider accounts"
  ON public.user_provider_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR EXISTS (
        SELECT 1
        FROM public.subscriptions s
        WHERE s.user_id = auth.uid()
          AND s.status = 'active'
          AND s.plan_type <> 'trial'
          AND (s.expires_at IS NULL OR s.expires_at > now())
      )
    )
  );