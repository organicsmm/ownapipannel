ALTER TABLE public.subscription_plans DROP CONSTRAINT IF EXISTS subscription_plans_plan_type_check;
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_type_check;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT conrelid::regclass AS tbl, conname
    FROM pg_constraint
    WHERE contype = 'c'
      AND conrelid IN ('public.subscription_plans'::regclass, 'public.subscriptions'::regclass)
      AND pg_get_constraintdef(oid) ILIKE '%plan_type%'
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
  END LOOP;
END $$;

ALTER TABLE public.subscription_plans
  ADD CONSTRAINT subscription_plans_plan_type_check
  CHECK (plan_type IN ('monthly','yearly','lifetime'));

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_plan_type_check
  CHECK (plan_type IN ('none','monthly','yearly','lifetime'));

INSERT INTO public.subscription_plans (plan_type, price_inr, duration_days, is_active)
VALUES ('yearly', 20670, 365, true)
ON CONFLICT (plan_type) DO UPDATE
  SET duration_days = 365,
      is_active = true,
      updated_at = now();

CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _user_id
      AND status = 'active'
      AND plan_type IN ('monthly','yearly','lifetime')
      AND (expires_at IS NULL OR expires_at > now())
  )
$function$;
