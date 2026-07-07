
CREATE TABLE IF NOT EXISTS public.oxapay_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL,
  status text NOT NULL,
  signature_prefix text NOT NULL,
  payload jsonb,
  activation_result jsonb,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT oxapay_webhook_events_dedup UNIQUE (order_id, status, signature_prefix)
);

CREATE INDEX IF NOT EXISTS oxapay_webhook_events_order_idx
  ON public.oxapay_webhook_events(order_id, created_at DESC);

REVOKE ALL ON public.oxapay_webhook_events FROM anon, authenticated;
GRANT ALL ON public.oxapay_webhook_events TO service_role;

ALTER TABLE public.oxapay_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_webhook_events"
  ON public.oxapay_webhook_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
