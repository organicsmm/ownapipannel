CREATE OR REPLACE FUNCTION public.claim_user_api_run_provider(_run_id uuid, _provider_account_id uuid, _provider_account_name text, _link text, _engagement_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _row_count integer := 0;
BEGIN
  -- Atomic per-run claim.
  PERFORM pg_advisory_xact_lock(hashtextextended(coalesce(_run_id::text, ''), 0));

  -- Restore provider-level busy block: if this same provider already has an
  -- active order for the same link/service, do not claim this run. The executor
  -- will then try the next priority provider, and only defer if all are busy.
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

CREATE OR REPLACE FUNCTION public.requeue_user_api_runs_without_provider_order(_max_age_minutes integer DEFAULT 1)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _requeued integer := 0;
BEGIN
  UPDATE public.organic_run_schedule rs
  SET
    status = 'pending',
    scheduled_at = now() + ((random() * 90)::int || ' seconds')::interval,
    provider_account_id = NULL,
    provider_account_name = NULL,
    provider_order_id = NULL,
    provider_status = NULL,
    error_message = COALESCE(rs.error_message, 'Provider returned no order id; requeued for priority rotation'),
    last_status_check = now()
  FROM public.engagement_order_items eoi
  JOIN public.engagement_orders eo ON eo.id = eoi.engagement_order_id
  WHERE rs.engagement_order_item_id = eoi.id
    AND eo.use_user_api = true
    AND eo.status IN ('pending','processing')
    AND eoi.status IN ('pending','processing')
    AND rs.status = 'started'
    AND rs.provider_order_id IS NULL
    AND rs.started_at < now() - make_interval(mins => GREATEST(1, _max_age_minutes))
    AND (
      rs.provider_response IS NULL
      OR rs.provider_response::text ~* 'active order|busy|already|wait|try again|fail|error'
    );

  GET DIAGNOSTICS _requeued = ROW_COUNT;
  RETURN json_build_object('requeued', _requeued, 'ran_at', now());
END;
$function$;