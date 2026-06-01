-- Recover stuck 'started' runs (lost provider response) by auto-completing them
UPDATE organic_run_schedule
SET status = 'completed',
    completed_at = now(),
    provider_status = 'Completed',
    provider_remains = 0,
    error_message = 'Auto-completed (provider response lost; assumed delivered)',
    last_status_check = now()
WHERE status = 'started'
  AND provider_order_id IS NULL
  AND engagement_order_item_id IN (
    SELECT id FROM engagement_order_items
    WHERE engagement_order_id IN (
      SELECT id FROM engagement_orders WHERE use_user_api = true AND status NOT IN ('cancelled','completed')
    )
  );

-- Recompute item statuses
UPDATE engagement_order_items i
SET status = CASE
  WHEN (SELECT count(*) FROM organic_run_schedule WHERE engagement_order_item_id = i.id AND status IN ('pending','started')) > 0 THEN 'processing'
  WHEN (SELECT count(*) FROM organic_run_schedule WHERE engagement_order_item_id = i.id) =
       (SELECT count(*) FROM organic_run_schedule WHERE engagement_order_item_id = i.id AND status = 'completed') THEN 'completed'
  WHEN (SELECT count(*) FROM organic_run_schedule WHERE engagement_order_item_id = i.id AND status = 'completed') > 0 THEN 'partial'
  ELSE 'failed'
END
WHERE engagement_order_id IN (SELECT id FROM engagement_orders WHERE use_user_api = true AND status NOT IN ('cancelled','completed'));

-- Recompute order statuses
UPDATE engagement_orders o
SET status = CASE
  WHEN (SELECT count(*) FROM engagement_order_items WHERE engagement_order_id = o.id AND status IN ('processing','pending')) > 0 THEN 'processing'
  WHEN (SELECT count(*) FROM engagement_order_items WHERE engagement_order_id = o.id) =
       (SELECT count(*) FROM engagement_order_items WHERE engagement_order_id = o.id AND status = 'completed') THEN 'completed'
  WHEN (SELECT count(*) FROM engagement_order_items WHERE engagement_order_id = o.id AND status IN ('completed','partial')) > 0 THEN 'partial'
  ELSE 'failed'
END
WHERE use_user_api = true AND status NOT IN ('cancelled','completed');