DROP POLICY IF EXISTS "Users update own bundles" ON public.user_bundles;
CREATE POLICY "Users update own bundles" ON public.user_bundles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);