
-- Remove admin override on user-owned API/provider/bundle data so admins only see their own.

-- user_provider_accounts
DROP POLICY IF EXISTS "Users view own provider accounts" ON public.user_provider_accounts;
DROP POLICY IF EXISTS "Users update own provider accounts" ON public.user_provider_accounts;
DROP POLICY IF EXISTS "Users delete own provider accounts" ON public.user_provider_accounts;

CREATE POLICY "Users view own provider accounts"
ON public.user_provider_accounts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users update own provider accounts"
ON public.user_provider_accounts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users delete own provider accounts"
ON public.user_provider_accounts FOR DELETE
USING (auth.uid() = user_id);

-- user_bundles
DROP POLICY IF EXISTS "Users update own bundles" ON public.user_bundles;
DROP POLICY IF EXISTS "Users delete own bundles" ON public.user_bundles;
DROP POLICY IF EXISTS "Users view own bundles" ON public.user_bundles;

CREATE POLICY "Users view own bundles"
ON public.user_bundles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users update own bundles"
ON public.user_bundles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users delete own bundles"
ON public.user_bundles FOR DELETE
USING (auth.uid() = user_id);

-- user_bundle_items
DROP POLICY IF EXISTS "Users view own bundle items" ON public.user_bundle_items;
DROP POLICY IF EXISTS "Users update own bundle items" ON public.user_bundle_items;
DROP POLICY IF EXISTS "Users delete own bundle items" ON public.user_bundle_items;

CREATE POLICY "Users view own bundle items"
ON public.user_bundle_items FOR SELECT
USING (EXISTS (SELECT 1 FROM user_bundles b WHERE b.id = user_bundle_items.user_bundle_id AND b.user_id = auth.uid()));

CREATE POLICY "Users update own bundle items"
ON public.user_bundle_items FOR UPDATE
USING (EXISTS (SELECT 1 FROM user_bundles b WHERE b.id = user_bundle_items.user_bundle_id AND b.user_id = auth.uid()));

CREATE POLICY "Users delete own bundle items"
ON public.user_bundle_items FOR DELETE
USING (EXISTS (SELECT 1 FROM user_bundles b WHERE b.id = user_bundle_items.user_bundle_id AND b.user_id = auth.uid()));

-- user_bundle_item_providers
DROP POLICY IF EXISTS "Users view own item providers" ON public.user_bundle_item_providers;
DROP POLICY IF EXISTS "Users update own item providers" ON public.user_bundle_item_providers;
DROP POLICY IF EXISTS "Users delete own item providers" ON public.user_bundle_item_providers;

CREATE POLICY "Users view own item providers"
ON public.user_bundle_item_providers FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users update own item providers"
ON public.user_bundle_item_providers FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users delete own item providers"
ON public.user_bundle_item_providers FOR DELETE
USING (auth.uid() = user_id);
