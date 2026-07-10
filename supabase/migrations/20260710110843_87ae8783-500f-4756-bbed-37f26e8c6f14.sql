CREATE POLICY "admins_select_all_subscriptions"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));