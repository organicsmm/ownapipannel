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
    WHEN 'monthly'  THEN _expected_amount := 39;  _duration_days := 30;
    WHEN 'yearly'   THEN _expected_amount := 249; _duration_days := 365;
    WHEN 'lifetime' THEN _expected_amount := 499; _duration_days := NULL;
    ELSE RAISE EXCEPTION 'Invalid plan: %', p_plan;
  END CASE;

  SELECT * INTO _deposit FROM public.oxapay_deposits WHERE order_id = p_order_id FOR UPDATE;
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

  RETURN json_build_object('activated', true, 'plan_type', p_plan, 'expires_at', _new_expires, 'user_id', p_user_id);
END;
$function$;