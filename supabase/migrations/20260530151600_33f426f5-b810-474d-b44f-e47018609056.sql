
-- =========================================================
-- USER PROVIDER ACCOUNTS
-- =========================================================
CREATE TABLE public.user_provider_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  api_url text NOT NULL,
  api_key text NOT NULL,
  priority integer DEFAULT 1,
  is_active boolean DEFAULT true,
  balance numeric,
  balance_currency text,
  balance_checked_at timestamptz,
  last_balance_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_provider_accounts TO authenticated;
GRANT ALL ON public.user_provider_accounts TO service_role;
ALTER TABLE public.user_provider_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own provider accounts"
  ON public.user_provider_accounts FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Active subscribers insert own provider accounts"
  ON public.user_provider_accounts FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.user_id = auth.uid() AND s.status = 'active')
  );

CREATE POLICY "Users update own provider accounts"
  ON public.user_provider_accounts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users delete own provider accounts"
  ON public.user_provider_accounts FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE INDEX idx_user_provider_accounts_user ON public.user_provider_accounts(user_id);

CREATE TRIGGER trg_user_provider_accounts_updated
  BEFORE UPDATE ON public.user_provider_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- USER SERVICES (imported from user's provider)
-- =========================================================
CREATE TABLE public.user_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_provider_account_id uuid NOT NULL REFERENCES public.user_provider_accounts(id) ON DELETE CASCADE,
  provider_service_id text NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  markup_percent numeric DEFAULT 0,
  min_quantity integer NOT NULL DEFAULT 10,
  max_quantity integer NOT NULL DEFAULT 100000,
  type text,
  refill text,
  cancel_allowed text,
  drip_feed_enabled boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_provider_account_id, provider_service_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_services TO authenticated;
GRANT ALL ON public.user_services TO service_role;
ALTER TABLE public.user_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own services"
  ON public.user_services FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Active subscribers insert own services"
  ON public.user_services FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.user_id = auth.uid() AND s.status = 'active')
  );

CREATE POLICY "Users update own services"
  ON public.user_services FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users delete own services"
  ON public.user_services FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE INDEX idx_user_services_user ON public.user_services(user_id);
CREATE INDEX idx_user_services_provider_account ON public.user_services(user_provider_account_id);
CREATE INDEX idx_user_services_category ON public.user_services(category);

CREATE TRIGGER trg_user_services_updated
  BEFORE UPDATE ON public.user_services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- USER BUNDLES + BUNDLE ITEMS
-- =========================================================
CREATE TABLE public.user_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  platform text NOT NULL,
  description text,
  icon text DEFAULT 'rocket',
  is_active boolean DEFAULT true,
  use_custom_ratios boolean DEFAULT false,
  ai_organic_enabled boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_bundles TO authenticated;
GRANT ALL ON public.user_bundles TO service_role;
ALTER TABLE public.user_bundles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own bundles"
  ON public.user_bundles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Active subscribers insert own bundles"
  ON public.user_bundles FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.user_id = auth.uid() AND s.status = 'active')
  );

CREATE POLICY "Users update own bundles"
  ON public.user_bundles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users delete own bundles"
  ON public.user_bundles FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE INDEX idx_user_bundles_user ON public.user_bundles(user_id);

CREATE TRIGGER trg_user_bundles_updated
  BEFORE UPDATE ON public.user_bundles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- bundle items
CREATE TABLE public.user_bundle_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_bundle_id uuid NOT NULL REFERENCES public.user_bundles(id) ON DELETE CASCADE,
  user_service_id uuid REFERENCES public.user_services(id) ON DELETE SET NULL,
  engagement_type text NOT NULL,
  ratio_percent numeric DEFAULT 100,
  is_base boolean DEFAULT false,
  default_drip_qty_per_run integer DEFAULT 500,
  default_drip_interval integer DEFAULT 1,
  default_drip_interval_unit text DEFAULT 'hours',
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_bundle_items TO authenticated;
GRANT ALL ON public.user_bundle_items TO service_role;
ALTER TABLE public.user_bundle_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own bundle items"
  ON public.user_bundle_items FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_bundles b WHERE b.id = user_bundle_id AND (b.user_id = auth.uid() OR has_role(auth.uid(), 'admin')))
  );

CREATE POLICY "Users insert own bundle items"
  ON public.user_bundle_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_bundles b WHERE b.id = user_bundle_id AND b.user_id = auth.uid())
  );

CREATE POLICY "Users update own bundle items"
  ON public.user_bundle_items FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_bundles b WHERE b.id = user_bundle_id AND (b.user_id = auth.uid() OR has_role(auth.uid(), 'admin')))
  );

CREATE POLICY "Users delete own bundle items"
  ON public.user_bundle_items FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_bundles b WHERE b.id = user_bundle_id AND (b.user_id = auth.uid() OR has_role(auth.uid(), 'admin')))
  );

CREATE INDEX idx_user_bundle_items_bundle ON public.user_bundle_items(user_bundle_id);

-- =========================================================
-- ROUTING FIELDS on existing orders / engagement_orders
-- =========================================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS use_user_api boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS user_provider_account_id uuid REFERENCES public.user_provider_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS user_service_id uuid REFERENCES public.user_services(id) ON DELETE SET NULL;

ALTER TABLE public.engagement_orders
  ADD COLUMN IF NOT EXISTS use_user_api boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS user_provider_account_id uuid REFERENCES public.user_provider_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS user_bundle_id uuid REFERENCES public.user_bundles(id) ON DELETE SET NULL;

ALTER TABLE public.engagement_order_items
  ADD COLUMN IF NOT EXISTS user_service_id uuid REFERENCES public.user_services(id) ON DELETE SET NULL;
