CREATE OR REPLACE FUNCTION public.user_cancel_and_delete_engagement_orders(_order_ids uuid[])
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _owned uuid[];
  _affected_batches uuid[];
  _deleted_runs int := 0;
  _deleted_items int := 0;
  _deleted_orders int := 0;
  _deleted_batch_items int := 0;
  _deleted_empty_batches int := 0;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _order_ids IS NULL OR array_length(_order_ids, 1) IS NULL THEN
    RETURN json_build_object('deleted_orders', 0);
  END IF;

  -- Only this user's orders
  SELECT array_agg(id) INTO _owned
  FROM public.engagement_orders
  WHERE id = ANY(_order_ids) AND user_id = _uid;

  IF _owned IS NULL OR array_length(_owned, 1) IS NULL THEN
    RETURN json_build_object('deleted_orders', 0);
  END IF;

  -- Cancel pending runs
  UPDATE public.organic_run_schedule rs
  SET status = 'cancelled',
      error_message = COALESCE(rs.error_message, 'User cancelled order')
  FROM public.engagement_order_items eoi
  WHERE rs.engagement_order_item_id = eoi.id
    AND eoi.engagement_order_id = ANY(_owned)
    AND rs.status = 'pending';

  -- Mark terminal
  UPDATE public.engagement_order_items
  SET status = 'cancelled'
  WHERE engagement_order_id = ANY(_owned)
    AND status NOT IN ('completed','cancelled','failed','partial');

  UPDATE public.engagement_orders
  SET status = 'cancelled', completed_at = COALESCE(completed_at, now())
  WHERE id = ANY(_owned)
    AND status NOT IN ('completed','cancelled','failed','partial');

  -- Capture batches that reference these orders BEFORE deleting batch items
  SELECT array_agg(DISTINCT batch_id) INTO _affected_batches
  FROM public.mass_order_batch_items
  WHERE engagement_order_id = ANY(_owned)
    AND user_id = _uid;

  -- Delete mass_order_batch_items rows pointing to these orders
  WITH d AS (
    DELETE FROM public.mass_order_batch_items
    WHERE engagement_order_id = ANY(_owned)
      AND user_id = _uid
    RETURNING 1
  ) SELECT count(*) INTO _deleted_batch_items FROM d;

  -- Hard delete: runs -> items -> orders
  WITH d AS (
    DELETE FROM public.organic_run_schedule rs
    USING public.engagement_order_items eoi
    WHERE rs.engagement_order_item_id = eoi.id
      AND eoi.engagement_order_id = ANY(_owned)
    RETURNING 1
  ) SELECT count(*) INTO _deleted_runs FROM d;

  WITH d AS (
    DELETE FROM public.engagement_order_items
    WHERE engagement_order_id = ANY(_owned)
    RETURNING 1
  ) SELECT count(*) INTO _deleted_items FROM d;

  WITH d AS (
    DELETE FROM public.engagement_orders
    WHERE id = ANY(_owned) AND user_id = _uid
    RETURNING 1
  ) SELECT count(*) INTO _deleted_orders FROM d;

  -- Delete batches that are now empty (no remaining items)
  IF _affected_batches IS NOT NULL AND array_length(_affected_batches, 1) IS NOT NULL THEN
    WITH d AS (
      DELETE FROM public.mass_order_batches b
      WHERE b.id = ANY(_affected_batches)
        AND b.user_id = _uid
        AND NOT EXISTS (
          SELECT 1 FROM public.mass_order_batch_items mi
          WHERE mi.batch_id = b.id
        )
      RETURNING 1
    ) SELECT count(*) INTO _deleted_empty_batches FROM d;
  END IF;

  RETURN json_build_object(
    'deleted_orders', _deleted_orders,
    'deleted_items', _deleted_items,
    'deleted_runs', _deleted_runs,
    'deleted_batch_items', _deleted_batch_items,
    'deleted_empty_batches', _deleted_empty_batches
  );
END;
$function$;