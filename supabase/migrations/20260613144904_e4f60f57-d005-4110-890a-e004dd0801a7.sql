CREATE OR REPLACE FUNCTION public.claim_user_api_run_provider(
  _run_id uuid,
  _provider_account_id uuid,
  _provider_account_name text,
  _link text,
  _engagement_type text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _row_count integer := 0;
BEGIN
  -- Atomic claim only: provider priority is handled by the executor.
  -- Do not block the same link/service behind an older provider order; the
  -- provider itself will accept/reject and the executor will rotate on errors.
  PERFORM pg_advisory_xact_lock(hashtextextended(coalesce(_run_id::text, ''), 0));

  UPDATE public.organic_run_schedule ors
  SET
    status = 'started',
    started_at = now(),
    provider_account_id = _provider_account_id,
    provider_account_name = _provider_account_name,
    provider_order_id = NULL,
    provider_status = NULL,
    provider_response = NULL,
    error_message = NULL,
    last_status_check = now()
  WHERE ors.id = _run_id
    AND ors.status = 'pending';

  GET DIAGNOSTICS _row_count = ROW_COUNT;
  RETURN _row_count > 0;
END;
$function$;