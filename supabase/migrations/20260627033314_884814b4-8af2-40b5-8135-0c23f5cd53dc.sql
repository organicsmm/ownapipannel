
-- ============ subscription_plans ============
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_type text NOT NULL UNIQUE CHECK (plan_type IN ('monthly','lifetime')),
  price_inr numeric(10,2) NOT NULL CHECK (price_inr > 0),
  duration_days integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.subscription_plans TO anon, authenticated;
GRANT ALL ON public.subscription_plans TO service_role;

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active plans"
  ON public.subscription_plans FOR SELECT
  USING (true);

CREATE POLICY "Only admins manage plans"
  ON public.subscription_plans FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.subscription_plans (plan_type, price_inr, duration_days)
VALUES ('monthly', 499.00, 30), ('lifetime', 2999.00, NULL)
ON CONFLICT (plan_type) DO NOTHING;

-- ============ zapupi_subscription_payments ============
CREATE TABLE IF NOT EXISTS public.zapupi_subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type text NOT NULL CHECK (plan_type IN ('monthly','lifetime')),
  order_id text NOT NULL UNIQUE,
  amount_inr numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','success','failed')),
  activated boolean NOT NULL DEFAULT false,
  txn_id text,
  utr text,
  payment_url text,
  gateway_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.zapupi_subscription_payments TO authenticated;
GRANT ALL ON public.zapupi_subscription_payments TO service_role;

ALTER TABLE public.zapupi_subscription_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own zapupi payments"
  ON public.zapupi_subscription_payments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Deny anon access zapupi"
  ON public.zapupi_subscription_payments
  AS RESTRICTIVE FOR SELECT
  TO public
  USING (auth.uid() IS NOT NULL);

CREATE TRIGGER trg_zapupi_payments_updated_at
  BEFORE UPDATE ON public.zapupi_subscription_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_zapupi_user ON public.zapupi_subscription_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_zapupi_status ON public.zapupi_subscription_payments(status);
CREATE INDEX IF NOT EXISTS idx_zapupi_created ON public.zapupi_subscription_payments(created_at DESC);

-- ============ subscriptions: activation_source ============
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS activation_source text NOT NULL DEFAULT 'manual'
  CHECK (activation_source IN ('manual','zapupi','trial','system'));

-- ============ activate_subscription_zapupi RPC ============
CREATE OR REPLACE FUNCTION public.activate_subscription_zapupi(
  p_order_id text,
  p_txn_id text,
  p_utr text,
  p_gateway_response jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _payment public.zapupi_subscription_payments%ROWTYPE;
  _plan public.subscription_plans%ROWTYPE;
  _new_expires timestamptz;
  _current_expires timestamptz;
BEGIN
  -- Lock by order id to make duplicate webhooks safe.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_order_id, 42));

  SELECT * INTO _payment FROM public.zapupi_subscription_payments
  WHERE order_id = p_order_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('activated', false, 'error', 'order_not_found');
  END IF;

  IF _payment.activated THEN
    RETURN json_build_object('activated', false, 'duplicate', true,
      'plan_type', _payment.plan_type);
  END IF;

  SELECT * INTO _plan FROM public.subscription_plans
  WHERE plan_type = _payment.plan_type AND is_active = true;

  IF NOT FOUND THEN
    RETURN json_build_object('activated', false, 'error', 'plan_inactive');
  END IF;

  -- Calculate expiry: lifetime = NULL; monthly = 30 days from max(now, current_expires)
  IF _plan.duration_days IS NULL THEN
    _new_expires := NULL;
  ELSE
    SELECT expires_at INTO _current_expires FROM public.subscriptions WHERE user_id = _payment.user_id;
    _new_expires := GREATEST(COALESCE(_current_expires, now()), now()) + make_interval(days => _plan.duration_days);
  END IF;

  INSERT INTO public.subscriptions (user_id, plan_type, status, activated_at, expires_at, activation_source)
  VALUES (_payment.user_id, _payment.plan_type, 'active', now(), _new_expires, 'zapupi')
  ON CONFLICT (user_id) DO UPDATE
    SET plan_type = EXCLUDED.plan_type,
        status = 'active',
        activated_at = now(),
        expires_at = EXCLUDED.expires_at,
        activation_source = 'zapupi',
        updated_at = now();

  UPDATE public.zapupi_subscription_payments
  SET status = 'success',
      activated = true,
      txn_id = COALESCE(p_txn_id, txn_id),
      utr = COALESCE(p_utr, utr),
      gateway_response = COALESCE(p_gateway_response, gateway_response),
      updated_at = now()
  WHERE id = _payment.id;

  RETURN json_build_object(
    'activated', true,
    'plan_type', _payment.plan_type,
    'expires_at', _new_expires,
    'user_id', _payment.user_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.activate_subscription_zapupi(text, text, text, jsonb) TO service_role;
