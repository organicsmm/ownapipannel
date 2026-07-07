
ALTER TABLE public.subscription_plans DROP CONSTRAINT IF EXISTS subscription_plans_plan_type_check;
ALTER TABLE public.subscription_plans ADD CONSTRAINT subscription_plans_plan_type_check
  CHECK (plan_type = ANY (ARRAY['monthly'::text, 'yearly'::text, 'lifetime'::text]));

INSERT INTO public.subscription_plans (plan_type, price_inr, duration_days, is_active)
VALUES ('yearly', 20670, 365, true)
ON CONFLICT (plan_type) DO NOTHING;
