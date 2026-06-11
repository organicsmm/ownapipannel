
-- 1) Drop exact-duplicate indexes (reduces write amplification on hot tables)
DROP INDEX IF EXISTS public.idx_eoi_order_id;       -- duplicate of idx_engagement_order_items_order_id
DROP INDEX IF EXISTS public.idx_eoi_status;         -- duplicate of idx_engagement_order_items_status
DROP INDEX IF EXISTS public.idx_eo_order_number;    -- duplicate of idx_engagement_orders_order_number
DROP INDEX IF EXISTS public.idx_eo_user_created;    -- duplicate of idx_engagement_orders_user_id_created

-- 2) Helpful composite index for the executor's main query:
--    WHERE status='pending' AND scheduled_at <= now()  ORDER BY scheduled_at
--    (partial index keeps it small)
CREATE INDEX IF NOT EXISTS idx_ors_pending_due
  ON public.organic_run_schedule (scheduled_at)
  WHERE status = 'pending' AND engagement_order_item_id IS NOT NULL;

-- Provider-account claim lookup speedup (per-provider busy check)
CREATE INDEX IF NOT EXISTS idx_ors_provider_started
  ON public.organic_run_schedule (provider_account_id, engagement_order_item_id)
  WHERE status = 'started';

-- 3) Fast server-side summary RPC for the Engagement Orders list page
CREATE OR REPLACE FUNCTION public.get_user_engagement_orders_list(_limit int DEFAULT 100)
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT eo.id, eo.order_number, eo.status, eo.total_price, eo.link,
           eo.base_quantity, eo.created_at, eo.updated_at, eo.is_organic_mode
    FROM public.engagement_orders eo
    WHERE eo.user_id = auth.uid()
    ORDER BY eo.created_at DESC
    LIMIT GREATEST(1, LEAST(_limit, 500))
  ),
  item_runs AS (
    SELECT eoi.engagement_order_id,
           eoi.id AS item_id,
           eoi.engagement_type,
           eoi.quantity,
           eoi.status AS item_status,
           COUNT(rs.id)                                           AS total_runs,
           COUNT(rs.id) FILTER (WHERE rs.status='completed')      AS completed_runs,
           COUNT(rs.id) FILTER (WHERE rs.status='started')        AS started_runs,
           COUNT(rs.id) FILTER (WHERE rs.status='pending')        AS pending_runs,
           COALESCE(SUM(rs.quantity_to_send) FILTER (WHERE rs.status='completed'),0) AS delivered,
           MIN(rs.scheduled_at) FILTER (WHERE rs.status='pending') AS next_pending_at
    FROM public.engagement_order_items eoi
    LEFT JOIN public.organic_run_schedule rs ON rs.engagement_order_item_id = eoi.id
    WHERE eoi.engagement_order_id IN (SELECT id FROM base)
    GROUP BY eoi.id
  )
  SELECT COALESCE(json_agg(row), '[]'::json)
  FROM (
    SELECT
      b.id, b.order_number, b.status, b.total_price, b.link, b.base_quantity,
      b.created_at, b.updated_at, b.is_organic_mode,
      COALESCE((
        SELECT json_agg(json_build_object(
          'id', ir.item_id,
          'engagement_type', ir.engagement_type,
          'quantity', ir.quantity,
          'status', ir.item_status,
          'total_runs', ir.total_runs,
          'completed_runs', ir.completed_runs,
          'started_runs', ir.started_runs,
          'pending_runs', ir.pending_runs,
          'delivered', ir.delivered,
          'next_pending_at', ir.next_pending_at
        )) FROM item_runs ir WHERE ir.engagement_order_id = b.id
      ), '[]'::json) AS items
    FROM base b
    ORDER BY b.created_at DESC
  ) row;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_engagement_orders_list(int) TO authenticated;
