CREATE OR REPLACE FUNCTION public.cleanup_old_completed_engagement_orders()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  deleted_runs INT := 0;
  deleted_items INT := 0;
  deleted_orders INT := 0;
  deleted_stale_runs INT := 0;
BEGIN
  -- Target: engagement_orders in terminal states (completed/partial/failed/cancelled)
  -- where the LAST run (max scheduled_at across all items) is in a terminal state
  -- AND that last run finished more than 20 hours ago, AND no pending/started runs remain.
  WITH order_last_run AS (
    SELECT
      eo.id AS order_id,
      MAX(GREATEST(
        COALESCE(rs.completed_at, rs.started_at, rs.scheduled_at),
        rs.scheduled_at
      )) AS last_run_time,
      BOOL_OR(rs.status IN ('pending','started')) AS has_active
    FROM public.engagement_orders eo
    JOIN public.engagement_order_items eoi ON eoi.engagement_order_id = eo.id
    LEFT JOIN public.organic_run_schedule rs ON rs.engagement_order_item_id = eoi.id
    WHERE eo.status IN ('completed','partial','failed','cancelled')
    GROUP BY eo.id
  ),
  target_orders AS (
    SELECT olr.order_id AS id
    FROM order_last_run olr
    WHERE COALESCE(olr.has_active, false) = false
      AND olr.last_run_time IS NOT NULL
      AND olr.last_run_time < now() - interval '20 hours'
    UNION
    -- Also include orders with no runs at all but old enough
    SELECT eo.id
    FROM public.engagement_orders eo
    WHERE eo.status IN ('completed','partial','failed','cancelled')
      AND COALESCE(eo.completed_at, eo.updated_at, eo.created_at) < now() - interval '20 hours'
      AND NOT EXISTS (
        SELECT 1 FROM public.engagement_order_items eoi2
        JOIN public.organic_run_schedule rs2 ON rs2.engagement_order_item_id = eoi2.id
        WHERE eoi2.engagement_order_id = eo.id
          AND rs2.status IN ('pending','started')
      )
  ),
  target_items AS (
    SELECT eoi.id FROM public.engagement_order_items eoi
    JOIN target_orders t ON t.id = eoi.engagement_order_id
  ),
  del_runs AS (
    DELETE FROM public.organic_run_schedule
    WHERE engagement_order_item_id IN (SELECT id FROM target_items)
    RETURNING 1
  )
  SELECT count(*) INTO deleted_runs FROM del_runs;

  WITH order_last_run AS (
    SELECT
      eo.id AS order_id,
      MAX(GREATEST(
        COALESCE(rs.completed_at, rs.started_at, rs.scheduled_at),
        rs.scheduled_at
      )) AS last_run_time,
      BOOL_OR(rs.status IN ('pending','started')) AS has_active
    FROM public.engagement_orders eo
    JOIN public.engagement_order_items eoi ON eoi.engagement_order_id = eo.id
    LEFT JOIN public.organic_run_schedule rs ON rs.engagement_order_item_id = eoi.id
    WHERE eo.status IN ('completed','partial','failed','cancelled')
    GROUP BY eo.id
  ),
  target_orders AS (
    SELECT olr.order_id AS id
    FROM order_last_run olr
    WHERE COALESCE(olr.has_active, false) = false
      AND olr.last_run_time IS NOT NULL
      AND olr.last_run_time < now() - interval '20 hours'
    UNION
    SELECT eo.id
    FROM public.engagement_orders eo
    WHERE eo.status IN ('completed','partial','failed','cancelled')
      AND COALESCE(eo.completed_at, eo.updated_at, eo.created_at) < now() - interval '20 hours'
      AND NOT EXISTS (
        SELECT 1 FROM public.engagement_order_items eoi2
        JOIN public.organic_run_schedule rs2 ON rs2.engagement_order_item_id = eoi2.id
        WHERE eoi2.engagement_order_id = eo.id
          AND rs2.status IN ('pending','started')
      )
  ),
  del_items AS (
    DELETE FROM public.engagement_order_items
    WHERE engagement_order_id IN (SELECT id FROM target_orders)
    RETURNING 1
  )
  SELECT count(*) INTO deleted_items FROM del_items;

  WITH order_last_run AS (
    SELECT
      eo.id AS order_id,
      MAX(GREATEST(
        COALESCE(rs.completed_at, rs.started_at, rs.scheduled_at),
        rs.scheduled_at
      )) AS last_run_time,
      BOOL_OR(rs.status IN ('pending','started')) AS has_active
    FROM public.engagement_orders eo
    JOIN public.engagement_order_items eoi ON eoi.engagement_order_id = eo.id
    LEFT JOIN public.organic_run_schedule rs ON rs.engagement_order_item_id = eoi.id
    WHERE eo.status IN ('completed','partial','failed','cancelled')
    GROUP BY eo.id
  ),
  target_orders AS (
    SELECT olr.order_id AS id
    FROM order_last_run olr
    WHERE COALESCE(olr.has_active, false) = false
      AND olr.last_run_time IS NOT NULL
      AND olr.last_run_time < now() - interval '20 hours'
    UNION
    SELECT eo.id
    FROM public.engagement_orders eo
    WHERE eo.status IN ('completed','partial','failed','cancelled')
      AND COALESCE(eo.completed_at, eo.updated_at, eo.created_at) < now() - interval '20 hours'
      AND NOT EXISTS (
        SELECT 1 FROM public.engagement_order_items eoi2
        JOIN public.organic_run_schedule rs2 ON rs2.engagement_order_item_id = eoi2.id
        WHERE eoi2.engagement_order_id = eo.id
          AND rs2.status IN ('pending','started')
      )
  ),
  del_orders AS (
    DELETE FROM public.engagement_orders
    WHERE id IN (SELECT id FROM target_orders)
    RETURNING 1
  )
  SELECT count(*) INTO deleted_orders FROM del_orders;

  -- Also clean stale pending runs whose parent got paused/cancelled
  WITH del_stale AS (
    DELETE FROM public.organic_run_schedule rs
    WHERE rs.status = 'pending'
      AND rs.engagement_order_item_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.engagement_order_items eoi
        JOIN public.engagement_orders eo ON eo.id = eoi.engagement_order_id
        WHERE eoi.id = rs.engagement_order_item_id
          AND (eoi.status IN ('paused','cancelled') OR eo.status IN ('paused','cancelled'))
      )
    RETURNING 1
  )
  SELECT count(*) INTO deleted_stale_runs FROM del_stale;

  RETURN json_build_object(
    'deleted_runs', deleted_runs,
    'deleted_items', deleted_items,
    'deleted_orders', deleted_orders,
    'deleted_stale_runs', deleted_stale_runs,
    'ran_at', now()
  );
END;
$function$;