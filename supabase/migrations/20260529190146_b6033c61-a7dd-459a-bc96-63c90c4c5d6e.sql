-- Category-based pricing: admin sets 1K rate per category, overrides service.price everywhere
CREATE TABLE IF NOT EXISTS public.category_pricing (
  category TEXT PRIMARY KEY,
  price_per_1k NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.category_pricing TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.category_pricing TO authenticated;
GRANT ALL ON public.category_pricing TO service_role;

ALTER TABLE public.category_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view category pricing"
  ON public.category_pricing FOR SELECT
  USING (true);

CREATE POLICY "Admins manage category pricing"
  ON public.category_pricing FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Update trigger
CREATE TRIGGER update_category_pricing_updated_at
  BEFORE UPDATE ON public.category_pricing
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime so admin price edits propagate instantly
ALTER PUBLICATION supabase_realtime ADD TABLE public.category_pricing;

-- Seed common categories with default 0 (admin will set actual price)
INSERT INTO public.category_pricing (category, price_per_1k)
SELECT DISTINCT category, 0 FROM public.services
WHERE category IS NOT NULL
ON CONFLICT (category) DO NOTHING;