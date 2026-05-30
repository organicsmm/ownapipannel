
-- Allow bundle items to reference provider service directly (no My Services step)
ALTER TABLE public.user_bundle_items
  ADD COLUMN IF NOT EXISTS user_provider_account_id uuid REFERENCES public.user_provider_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS provider_service_id text,
  ADD COLUMN IF NOT EXISTS service_name text,
  ADD COLUMN IF NOT EXISTS rate numeric,
  ADD COLUMN IF NOT EXISTS min_qty integer,
  ADD COLUMN IF NOT EXISTS max_qty integer;

ALTER TABLE public.user_bundle_items
  ALTER COLUMN user_service_id DROP NOT NULL;
