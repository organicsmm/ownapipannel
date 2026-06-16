ALTER TABLE public.mass_order_batches
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS payload jsonb;

CREATE INDEX IF NOT EXISTS idx_mass_order_batches_scheduled
  ON public.mass_order_batches (scheduled_at)
  WHERE status = 'scheduled';