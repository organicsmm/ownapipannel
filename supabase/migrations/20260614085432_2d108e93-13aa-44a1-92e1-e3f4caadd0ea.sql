-- Mass Order batches: groups N engagement_orders submitted together
CREATE TABLE public.mass_order_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_bundle_id UUID REFERENCES public.user_bundles(id) ON DELETE SET NULL,
  name TEXT,
  total_links INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  total_price NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processing', -- processing | completed | partial | failed
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mass_order_batches TO authenticated;
GRANT ALL ON public.mass_order_batches TO service_role;

ALTER TABLE public.mass_order_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own mass batches"
  ON public.mass_order_batches FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all mass batches"
  ON public.mass_order_batches FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER update_mass_order_batches_updated_at
  BEFORE UPDATE ON public.mass_order_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Per-link entry inside a batch (status + reference to engagement_orders)
CREATE TABLE public.mass_order_batch_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.mass_order_batches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  link TEXT NOT NULL,
  base_quantity INTEGER NOT NULL DEFAULT 0,
  time_limit_hours INTEGER NOT NULL DEFAULT 0,
  enabled_types JSONB NOT NULL DEFAULT '[]'::jsonb,
  engagement_order_id UUID REFERENCES public.engagement_orders(id) ON DELETE SET NULL,
  engagement_order_number INTEGER,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | success | failed
  error_message TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mass_order_batch_items TO authenticated;
GRANT ALL ON public.mass_order_batch_items TO service_role;

ALTER TABLE public.mass_order_batch_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own batch items"
  ON public.mass_order_batch_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all batch items"
  ON public.mass_order_batch_items FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX idx_mass_batch_items_batch ON public.mass_order_batch_items(batch_id);
CREATE INDEX idx_mass_batches_user_created ON public.mass_order_batches(user_id, created_at DESC);

CREATE TRIGGER update_mass_order_batch_items_updated_at
  BEFORE UPDATE ON public.mass_order_batch_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();