CREATE OR REPLACE FUNCTION public.admin_activate_subscription_by_email(
  _email text,
  _plan_type text,
  _admin_id uuid DEFAULT auth.uid()
)
RETURNS TABLE(user_id uuid, email text, full_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  IF _plan_type NOT IN ('monthly', 'lifetime') THEN
    RAISE EXCEPTION 'Invalid subscription plan';
  END IF;

  SELECT * INTO _target_user
  FROM auth.users au
  WHERE lower(au.email) = _normalized_email
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User account not found. Please make sure they signed up with this exact email.';
  END IF;

  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    _target_user.id,
    _target_user.email,
    COALESCE(_target_user.raw_user_meta_data->>'full_name', _target_user.raw_user_meta_data->>'name', '')
  )
  ON CONFLICT (user_id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = COALESCE(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name),
      updated_at = now();

  INSERT INTO public.wallets (user_id, balance, total_deposited, total_spent)
  VALUES (_target_user.id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_target_user.id, 'user'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  _expires_at := CASE
    WHEN _plan_type = 'monthly' THEN now() + interval '30 days'
    ELSE NULL
  END;

  INSERT INTO public.subscriptions (user_id, plan_type, status, activated_at, expires_at, activated_by)
  VALUES (_target_user.id, _plan_type, 'active', now(), _expires_at, COALESCE(_admin_id, auth.uid()))
  ON CONFLICT (user_id) DO UPDATE
  SET plan_type = EXCLUDED.plan_type,
      status = 'active',
      activated_at = now(),
      expires_at = EXCLUDED.expires_at,
      activated_by = EXCLUDED.activated_by,
      updated_at = now();

  RETURN QUERY
  SELECT
    _target_user.id,
    _target_user.email,
    COALESCE(
      NULLIF(_target_user.raw_user_meta_data->>'full_name', ''),
      NULLIF(_target_user.raw_user_meta_data->>'name', ''),
      split_part(_target_user.email, '@', 1)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_activate_subscription_by_email(text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_activate_subscription_by_email(text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_activate_subscription_by_email(text, text, uuid) TO service_role;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_user_created_subscription ON auth.users;
CREATE TRIGGER on_user_created_subscription
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.create_user_subscription();

INSERT INTO public.profiles (user_id, email, full_name)
SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', '')
FROM auth.users
ON CONFLICT (user_id) DO UPDATE
SET email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name),
    updated_at = now();

INSERT INTO public.wallets (user_id, balance, total_deposited, total_spent)
SELECT id, 0, 0, 0 FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'user'::public.app_role FROM auth.users
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.subscriptions (user_id, plan_type, status)
SELECT id, 'none', 'inactive' FROM auth.users
ON CONFLICT (user_id) DO NOTHING;