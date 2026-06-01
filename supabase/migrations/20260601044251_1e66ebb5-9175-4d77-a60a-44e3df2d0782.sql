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
SET search_path = public
AS $$
DECLARE
  _row_count integer := 0;
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      _provider_account_id::text || '|' || coalesce(_engagement_type, '') || '|' || coalesce(_link, ''),
      0
    )
  );

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
    AND ors.status = 'pending'
    AND NOT EXISTS (
      SELECT 1
      FROM public.organic_run_schedule busy
      JOIN public.engagement_order_items busy_item ON busy_item.id = busy.engagement_order_item_id
      JOIN public.engagement_orders busy_order ON busy_order.id = busy_item.engagement_order_id
      WHERE busy.status = 'started'
        AND busy.provider_account_id = _provider_account_id
        AND busy_item.engagement_type = _engagement_type
        AND busy_order.link = _link
        AND busy.id <> _run_id
    );

  GET DIAGNOSTICS _row_count = ROW_COUNT;
  RETURN _row_count > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_user_api_run_provider(uuid, uuid, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_user_api_run_provider(uuid, uuid, text, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.claim_user_api_run_provider(uuid, uuid, text, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_user_api_run_provider(uuid, uuid, text, text, text) TO service_role;