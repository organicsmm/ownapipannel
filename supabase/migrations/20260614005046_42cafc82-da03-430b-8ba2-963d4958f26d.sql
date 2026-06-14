CREATE OR REPLACE FUNCTION public.claim_user_api_run_provider(_run_id uuid, _provider_account_id uuid, _provider_account_name text, _link text, _engagement_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _row_count integer := 0;
BEGIN
  -- Serialize both this run and this provider/link/type lane. The second lock
  -- prevents concurrent executor invocations from checking "not busy" at the
  -- same time and sending many runs to the same provider.
  PERFORM pg_advisory_xact_lock(hashtextextended(coalesce(_run_id::text, ''), 0));
  PERFORM pg_advisory_xact_lock(hashtextextended(
    coalesce(_provider_account_id::text, '') || '|' || coalesce(_link, '') || '|' || coalesce(_engagement_type, ''),
    1
  ));

  -- Provider-level busy block: if this same provider already has an active
  -- order for the same link/service, do not claim this run. The executor will
  -- try the next priority provider, and only defer if all providers are busy.
  IF EXISTS (
    SELECT 1
    FROM public.organic_run_schedule active_rs
    JOIN public.engagement_order_items active_item ON active_item.id = active_rs.engagement_order_item_id
    JOIN public.engagement_orders active_order ON active_order.id = active_item.engagement_order_id
    WHERE active_rs.status = 'started'
      AND active_rs.provider_account_id = _provider_account_id
      AND active_order.link = _link
      AND active_item.engagement_type = _engagement_type
      AND active_order.status NOT IN ('completed','cancelled','failed','partial')
      AND active_item.status NOT IN ('completed','cancelled','failed','partial')
      AND active_rs.id <> _run_id
      AND (
        active_rs.provider_order_id IS NOT NULL
        OR active_rs.started_at > now() - interval '10 minutes'
      )
  ) THEN
    RETURN false;
  END IF;

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

REVOKE ALL ON FUNCTION public.claim_user_api_run_provider(uuid, uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_user_api_run_provider(uuid, uuid, text, text, text) TO service_role;