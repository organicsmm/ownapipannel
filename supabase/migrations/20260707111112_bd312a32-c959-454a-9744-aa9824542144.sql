
CREATE OR REPLACE FUNCTION public.admin_activate_subscription_by_email(_email text, _plan_type text, _admin_id uuid DEFAULT auth.uid())
 RETURNS TABLE(user_id uuid, email text, full_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _normalized_email text;
  _target_user auth.users%ROWTYPE;
  _expires_at timestamptz;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can activate subscriptions';
  END IF;

  _normalized_email := lower(trim(_email));

  IF _normalized_email IS NULL OR _normalized_email = '' THEN
    RAISE EXCEPTION 'Please enter email';
  END IF;

  IF _plan_type NOT IN ('monthly', 'yearly', 'lifetime') THEN
    RAISE EXCEPTION 'Invalid subscription plan';
  END IF;

  SELECT * INTO _target_user
  FROM auth.users au
  WHERE lower(au.email::text) = _normalized_email
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User account not found. Please make sure they signed up with this exact email.';
  END IF;

  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    _target_user.id,
    _target_user.email::text,
    COALESCE(_target_user.raw_user_meta_data->>'full_name', _target_user.raw_user_meta_data->>'name', '')
  )
  ON CONFLICT ON CONSTRAINT profiles_user_id_key DO UPDATE
  SET email = EXCLUDED.email,
      full_name = COALESCE(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name),
      updated_at = now();

  INSERT INTO public.wallets (user_id, balance, total_deposited, total_spent)
  VALUES (_target_user.id, 0, 0, 0)
  ON CONFLICT ON CONSTRAINT wallets_user_id_key DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_target_user.id, 'user'::public.app_role)
  ON CONFLICT ON CONSTRAINT user_roles_user_id_role_key DO NOTHING;

  _expires_at := CASE
    WHEN _plan_type = 'monthly' THEN now() + interval '30 days'
    WHEN _plan_type = 'yearly'  THEN now() + interval '365 days'
    ELSE NULL
  END;

  INSERT INTO public.subscriptions (user_id, plan_type, status, activated_at, expires_at, activated_by)
  VALUES (_target_user.id, _plan_type, 'active', now(), _expires_at, COALESCE(_admin_id, auth.uid()))
  ON CONFLICT ON CONSTRAINT subscriptions_user_id_key DO UPDATE
  SET plan_type = EXCLUDED.plan_type,
      status = 'active',
      activated_at = now(),
      expires_at = EXCLUDED.expires_at,
      activated_by = EXCLUDED.activated_by,
      updated_at = now();

  RETURN QUERY
  SELECT
    _target_user.id::uuid AS user_id,
    _target_user.email::text AS email,
    COALESCE(
      NULLIF(_target_user.raw_user_meta_data->>'full_name', ''),
      NULLIF(_target_user.raw_user_meta_data->>'name', ''),
      split_part(_target_user.email::text, '@', 1)
    )::text AS full_name;
END;
$function$;

CREATE OR REPLACE FUNCTION public.activate_subscription_oxapay(p_user_id uuid, p_order_id text, p_plan text, p_amount_usd numeric, p_track_id text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _deposit public.oxapay_deposits%ROWTYPE;
  _expected_amount numeric;
  _duration_days integer;
  _new_expires timestamptz;
  _current_expires timestamptz;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO public.security_audit_log (event_type, user_id, reason, metadata)
    VALUES ('blocked_activation_attempt', auth.uid(), 'Client tried to call activate RPC directly',
            jsonb_build_object('order_id', p_order_id, 'target_user', p_user_id));
    RAISE EXCEPTION 'Not permitted';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(coalesce(p_order_id,''), 91));

  CASE p_plan
    WHEN 'monthly'  THEN _expected_amount := 29;  _duration_days := 30;
    WHEN 'yearly'   THEN _expected_amount := 249; _duration_days := 365;
    WHEN 'lifetime' THEN _expected_amount := 499; _duration_days := NULL;
    ELSE RAISE EXCEPTION 'Invalid plan: %', p_plan;
  END CASE;

  SELECT * INTO _deposit FROM public.oxapay_deposits
   WHERE order_id = p_order_id
   FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.security_audit_log (event_type, reason, metadata)
    VALUES ('activation_missing_deposit', 'Order not found', jsonb_build_object('order_id', p_order_id));
    RAISE EXCEPTION 'Deposit not found';
  END IF;

  IF _deposit.credited = true THEN
    RETURN json_build_object('activated', false, 'duplicate', true, 'plan_type', _deposit.plan_type);
  END IF;

  IF _deposit.user_id <> p_user_id THEN
    INSERT INTO public.security_audit_log (event_type, user_id, reason, metadata)
    VALUES ('activation_user_mismatch', p_user_id, 'Deposit user_id differs from param',
            jsonb_build_object('order_id', p_order_id, 'deposit_user', _deposit.user_id));
    RAISE EXCEPTION 'User mismatch';
  END IF;

  IF _deposit.plan_type <> p_plan THEN
    INSERT INTO public.security_audit_log (event_type, user_id, reason, metadata)
    VALUES ('activation_plan_mismatch', p_user_id, 'Plan differs from deposit',
            jsonb_build_object('order_id', p_order_id, 'deposit_plan', _deposit.plan_type, 'param_plan', p_plan));
    RAISE EXCEPTION 'Plan mismatch';
  END IF;

  IF ABS(_deposit.amount_usd - _expected_amount) > 0.01
     OR ABS(p_amount_usd - _expected_amount) > 0.01 THEN
    INSERT INTO public.security_audit_log (event_type, user_id, reason, metadata)
    VALUES ('activation_amount_mismatch', p_user_id, 'Amount does not match plan',
            jsonb_build_object('order_id', p_order_id, 'expected', _expected_amount,
                               'deposit_amount', _deposit.amount_usd, 'paid_amount', p_amount_usd));
    RAISE EXCEPTION 'Amount mismatch';
  END IF;

  IF _duration_days IS NULL THEN
    _new_expires := NULL;
  ELSE
    SELECT expires_at INTO _current_expires FROM public.subscriptions WHERE user_id = p_user_id;
    _new_expires := GREATEST(COALESCE(_current_expires, now()), now()) + make_interval(days => _duration_days);
  END IF;

  INSERT INTO public.subscriptions (user_id, plan_type, status, activated_at, expires_at)
  VALUES (p_user_id, p_plan, 'active', now(), _new_expires)
  ON CONFLICT (user_id) DO UPDATE
     SET plan_type = EXCLUDED.plan_type,
         status = 'active',
         activated_at = now(),
         expires_at = EXCLUDED.expires_at,
         updated_at = now();

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
$function$;
