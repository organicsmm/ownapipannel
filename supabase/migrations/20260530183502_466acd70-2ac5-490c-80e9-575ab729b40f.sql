
-- Ensure cron + net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Update cleanup function: ONLY delete fully-completed engagement orders, 24h after completion
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
  -- Target: ONLY 'completed' engagement orders whose completed_at is older than 24h
  WITH target_orders AS (
    SELECT id FROM public.engagement_orders
    WHERE status = 'completed'
      AND completed_at IS NOT NULL
      AND completed_at < now() - interval '24 hours'
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

  WITH target_orders AS (
    SELECT id FROM public.engagement_orders
    WHERE status = 'completed'
      AND completed_at IS NOT NULL
      AND completed_at < now() - interval '24 hours'
  ),
  del_items AS (
    DELETE FROM public.engagement_order_items
    WHERE engagement_order_id IN (SELECT id FROM target_orders)
    RETURNING 1
  )
  SELECT count(*) INTO deleted_items FROM del_items;

  WITH del_orders AS (
    DELETE FROM public.engagement_orders
    WHERE status = 'completed'
      AND completed_at IS NOT NULL
      AND completed_at < now() - interval '24 hours'
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

-- Schedule the cleanup every hour (unschedule if exists first)
DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-completed-engagement-orders-hourly');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'cleanup-completed-engagement-orders-hourly',
  '0 * * * *',
  $$ SELECT public.cleanup_old_completed_engagement_orders(); $$
);
