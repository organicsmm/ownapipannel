
-- Critical indexes for billion-scale order handling
CREATE INDEX IF NOT EXISTS idx_organic_run_schedule_status_scheduled_at
  ON public.organic_run_schedule (status, scheduled_at)
  WHERE status IN ('pending', 'started');

CREATE INDEX IF NOT EXISTS idx_organic_run_schedule_item_status
  ON public.organic_run_schedule (engagement_order_item_id, status);

CREATE INDEX IF NOT EXISTS idx_organic_run_schedule_item_run_number
  ON public.organic_run_schedule (engagement_order_item_id, run_number);

CREATE INDEX IF NOT EXISTS idx_organic_run_schedule_provider_status
  ON public.organic_run_schedule (provider_account_id, status)
  WHERE status = 'started';

CREATE INDEX IF NOT EXISTS idx_engagement_order_items_order_id
  ON public.engagement_order_items (engagement_order_id);

CREATE INDEX IF NOT EXISTS idx_engagement_orders_order_number
  ON public.engagement_orders (order_number);

CREATE INDEX IF NOT EXISTS idx_engagement_orders_status_user
  ON public.engagement_orders (user_id, status);

-- Fast aggregate stats RPC: avoid pulling millions of rows to the browser
CREATE OR REPLACE FUNCTION public.get_engagement_order_run_stats(_order_id uuid)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'total_runs',     COUNT(*),
    'completed_runs', COUNT(*) FILTER (WHERE rs.status = 'completed'),
    'started_runs',   COUNT(*) FILTER (WHERE rs.status = 'started'),
    'pending_runs',   COUNT(*) FILTER (WHERE rs.status = 'pending'),
    'failed_runs',    COUNT(*) FILTER (WHERE rs.status = 'failed'),
    'cancelled_runs', COUNT(*) FILTER (WHERE rs.status = 'cancelled'),
    'total_scheduled', COALESCE(SUM(rs.quantity_to_send) FILTER (WHERE rs.status <> 'failed'), 0),
    'total_delivered', COALESCE(SUM(
        CASE
          WHEN lower(coalesce(rs.provider_status::text,'')) IN ('completed','complete') THEN rs.quantity_to_send
          WHEN rs.provider_remains IS NOT NULL THEN GREATEST(0, rs.quantity_to_send - rs.provider_remains)
          WHEN rs.status = 'completed' THEN rs.quantity_to_send
          ELSE 0
        END
      ), 0),
    'per_type', COALESCE((
       SELECT json_agg(t) FROM (
         SELECT
           eoi.engagement_type AS type,
           eoi.quantity AS target,
           COALESCE(SUM(r.quantity_to_send) FILTER (WHERE r.status <> 'failed'), 0) AS scheduled,
           COALESCE(SUM(
              CASE
                WHEN lower(coalesce(r.provider_status::text,'')) IN ('completed','complete') THEN r.quantity_to_send
                WHEN r.provider_remains IS NOT NULL THEN GREATEST(0, r.quantity_to_send - r.provider_remains)
                WHEN r.status = 'completed' THEN r.quantity_to_send
                ELSE 0
              END
           ), 0) AS delivered
         FROM public.engagement_order_items eoi
         LEFT JOIN public.organic_run_schedule r ON r.engagement_order_item_id = eoi.id
         WHERE eoi.engagement_order_id = _order_id
         GROUP BY eoi.id, eoi.engagement_type, eoi.quantity
       ) t
    ), '[]'::json),
    'next_run', (
      SELECT json_build_object(
        'id', n.id, 'scheduled_at', n.scheduled_at,
        'quantity_to_send', n.quantity_to_send, 'run_number', n.run_number
      )
      FROM public.organic_run_schedule n
      JOIN public.engagement_order_items eoi ON eoi.id = n.engagement_order_item_id
      WHERE eoi.engagement_order_id = _order_id AND n.status = 'pending'
      ORDER BY n.scheduled_at ASC
      LIMIT 1
    )
  )
  FROM public.organic_run_schedule rs
  JOIN public.engagement_order_items eoi ON eoi.id = rs.engagement_order_item_id
  WHERE eoi.engagement_order_id = _order_id;
$$;

REVOKE ALL ON FUNCTION public.get_engagement_order_run_stats(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_engagement_order_run_stats(uuid) TO authenticated, service_role;
