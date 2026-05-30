
-- Multi-provider rotation per user bundle item (mirrors admin's service_provider_mapping)
CREATE TABLE IF NOT EXISTS public.user_bundle_item_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_bundle_item_id uuid NOT NULL REFERENCES public.user_bundle_items(id) ON DELETE CASCADE,
  user_provider_account_id uuid NOT NULL REFERENCES public.user_provider_accounts(id) ON DELETE CASCADE,
  provider_service_id text NOT NULL,
  priority integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_bundle_item_id, user_provider_account_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_bundle_item_providers TO authenticated;
GRANT ALL ON public.user_bundle_item_providers TO service_role;

ALTER TABLE public.user_bundle_item_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own item providers"
  ON public.user_bundle_item_providers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Users insert own item providers"
  ON public.user_bundle_item_providers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own item providers"
  ON public.user_bundle_item_providers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Users delete own item providers"
  ON public.user_bundle_item_providers FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS idx_ubip_item ON public.user_bundle_item_providers(user_bundle_item_id, priority);
CREATE INDEX IF NOT EXISTS idx_ubip_user ON public.user_bundle_item_providers(user_id);

-- Backfill: for every existing user_bundle_item that has a linked provider, create a mapping row (priority 1)
INSERT INTO public.user_bundle_item_providers (user_id, user_bundle_item_id, user_provider_account_id, provider_service_id, priority, is_active)
SELECT b.user_id, i.id, i.user_provider_account_id, i.provider_service_id, 1, true
FROM public.user_bundle_items i
JOIN public.user_bundles b ON b.id = i.user_bundle_id
WHERE i.user_provider_account_id IS NOT NULL
  AND i.provider_service_id IS NOT NULL
ON CONFLICT (user_bundle_item_id, user_provider_account_id) DO NOTHING;
