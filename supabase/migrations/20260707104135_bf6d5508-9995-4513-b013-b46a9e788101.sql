
-- ============================================================
-- 1. UPDATE subscriptions TABLE
-- ============================================================

-- Drop old check constraint if exists, add new one supporting yearly plans
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_type_check;
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_active_sanity;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_plan_type_check
  CHECK (plan_type IN ('none','monthly','yearly','yearly_plus','lifetime','trial'));

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('inactive','active','expired','cancelled'));

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_active_sanity
  CHECK (
    status <> 'active'
    OR (activated_at IS NOT NULL
        AND plan_type IN ('monthly','yearly','yearly_plus','lifetime','trial'))
  );

-- LOCK DOWN RLS: users read-only, service_role full access
REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM authenticated;
REVOKE ALL ON public.subscriptions FROM anon;
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

-- Drop old permissive policies
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='subscriptions'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.subscriptions', p.policyname);
  END LOOP;
END $$;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_subscription_select"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- 2. oxapay_deposits TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.oxapay_deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  purpose text NOT NULL DEFAULT 'subscription' CHECK (purpose IN ('subscription')),
  plan_type text NOT NULL CHECK (plan_type IN ('monthly','yearly','yearly_plus','lifetime')),
  order_id text NOT NULL UNIQUE,
  amount_usd numeric(10,2) NOT NULL CHECK (amount_usd > 0),
  track_id text,
  pay_link text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','credited','failed','expired')),
  credited boolean NOT NULL DEFAULT false,
  raw_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS oxapay_deposits_track_id_unique
  ON public.oxapay_deposits(track_id) WHERE track_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS oxapay_deposits_user_created_idx
  ON public.oxapay_deposits(user_id, created_at DESC);

GRANT SELECT ON public.oxapay_deposits TO authenticated;
GRANT ALL ON public.oxapay_deposits TO service_role;

ALTER TABLE public.oxapay_deposits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_oxapay_deposits_select"
  ON public.oxapay_deposits FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- 3. security_audit_log TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid,
  ip_address text,
  reason text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS security_audit_log_created_idx
  ON public.security_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS security_audit_log_event_idx
  ON public.security_audit_log(event_type, created_at DESC);

REVOKE ALL ON public.security_audit_log FROM anon, authenticated;
GRANT ALL ON public.security_audit_log TO service_role;

ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_security_log"
  ON public.security_audit_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ============================================================
-- 4. has_active_subscription helper
-- ============================================================

CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _user_id
      AND status = 'active'
      AND plan_type IN ('monthly','yearly','yearly_plus','lifetime')
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

-- ============================================================
-- 5. activate_subscription_oxapay — WEBHOOK-ONLY activation
-- ============================================================

CREATE OR REPLACE FUNCTION public.activate_subscription_oxapay(
  p_user_id uuid,
  p_order_id text,
  p_plan text,
  p_amount_usd numeric,
  p_track_id text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _deposit public.oxapay_deposits%ROWTYPE;
  _expected_amount numeric;
  _duration_days integer;
  _new_expires timestamptz;
  _current_expires timestamptz;
BEGIN
  -- HARD BLOCK: only service-role/webhook may call
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO public.security_audit_log (event_type, user_id, reason, metadata)
    VALUES ('blocked_activation_attempt', auth.uid(), 'Client tried to call activate RPC directly',
            jsonb_build_object('order_id', p_order_id, 'target_user', p_user_id));
    RAISE EXCEPTION 'Not permitted';
  END IF;

  -- Serialize on order_id to prevent double-activation
  PERFORM pg_advisory_xact_lock(hashtextextended(coalesce(p_order_id,''), 91));

  -- Frozen plan → amount/duration table
  CASE p_plan
    WHEN 'monthly'     THEN _expected_amount := 35;  _duration_days := 30;
    WHEN 'yearly'      THEN _expected_amount := 100; _duration_days := 365;
    WHEN 'yearly_plus' THEN _expected_amount := 200; _duration_days := 365;
    WHEN 'lifetime'    THEN _expected_amount := 500; _duration_days := NULL;
    ELSE RAISE EXCEPTION 'Invalid plan: %', p_plan;
  END CASE;

  -- Lock deposit row
  SELECT * INTO _deposit FROM public.oxapay_deposits
   WHERE order_id = p_order_id
   FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.security_audit_log (event_type, reason, metadata)
    VALUES ('activation_missing_deposit', 'Order not found', jsonb_build_object('order_id', p_order_id));
    RAISE EXCEPTION 'Deposit not found';
  END IF;

  -- Idempotent
  IF _deposit.credited = true THEN
    RETURN json_build_object('activated', false, 'duplicate', true, 'plan_type', _deposit.plan_type);
  END IF;

  -- User must match
  IF _deposit.user_id <> p_user_id THEN
    INSERT INTO public.security_audit_log (event_type, user_id, reason, metadata)
    VALUES ('activation_user_mismatch', p_user_id, 'Deposit user_id differs from param',
            jsonb_build_object('order_id', p_order_id, 'deposit_user', _deposit.user_id));
    RAISE EXCEPTION 'User mismatch';
  END IF;

  -- Plan must match what user chose
  IF _deposit.plan_type <> p_plan THEN
    INSERT INTO public.security_audit_log (event_type, user_id, reason, metadata)
    VALUES ('activation_plan_mismatch', p_user_id, 'Plan differs from deposit',
            jsonb_build_object('order_id', p_order_id, 'deposit_plan', _deposit.plan_type, 'param_plan', p_plan));
    RAISE EXCEPTION 'Plan mismatch';
  END IF;

  -- Amount check (allow tiny rounding tolerance)
  IF ABS(_deposit.amount_usd - _expected_amount) > 0.01
     OR ABS(p_amount_usd - _expected_amount) > 0.01 THEN
    INSERT INTO public.security_audit_log (event_type, user_id, reason, metadata)
    VALUES ('activation_amount_mismatch', p_user_id, 'Amount does not match plan',
            jsonb_build_object('order_id', p_order_id, 'expected', _expected_amount,
                               'deposit_amount', _deposit.amount_usd, 'paid_amount', p_amount_usd));
    RAISE EXCEPTION 'Amount mismatch';
  END IF;

  -- Compute expiry (extend if already active)
  IF _duration_days IS NULL THEN
    _new_expires := NULL;
  ELSE
    SELECT expires_at INTO _current_expires FROM public.subscriptions WHERE user_id = p_user_id;
    _new_expires := GREATEST(COALESCE(_current_expires, now()), now()) + make_interval(days => _duration_days);
  END IF;

  -- Activate
  INSERT INTO public.subscriptions (user_id, plan_type, status, activated_at, expires_at)
  VALUES (p_user_id, p_plan, 'active', now(), _new_expires)
  ON CONFLICT (user_id) DO UPDATE
     SET plan_type = EXCLUDED.plan_type,
         status = 'active',
         activated_at = now(),
         expires_at = EXCLUDED.expires_at,
         updated_at = now();

  -- Mark deposit credited
  UPDATE public.oxapay_deposits
     SET credited = true,
         status = 'credited',
         track_id = COALESCE(p_track_id, track_id),
         updated_at = now()
   WHERE id = _deposit.id;

  INSERT INTO public.security_audit_log (event_type, user_id, reason, metadata)
  VALUES ('subscription_activated', p_user_id, 'OxaPay payment confirmed',
          jsonb_build_object('order_id', p_order_id, 'plan', p_plan, 'amount', p_amount_usd));

  RETURN json_build_object(
    'activated', true,
    'plan_type', p_plan,
    'expires_at', _new_expires,
    'user_id', p_user_id
  );
END;
$$;

-- Lock down RPC access
REVOKE ALL ON FUNCTION public.activate_subscription_oxapay(uuid, text, text, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_subscription_oxapay(uuid, text, text, numeric, text) TO service_role;

-- ============================================================
-- 6. Trigger to auto-create subscription for new signups
--    (already exists via create_user_subscription + handle_new_user)
--    Ensure trigger present on auth.users
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created_sub'
  ) THEN
    CREATE TRIGGER on_auth_user_created_sub
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.create_user_subscription();
  END IF;
END $$;
