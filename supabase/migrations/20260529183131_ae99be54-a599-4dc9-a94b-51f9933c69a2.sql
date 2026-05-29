-- Reorganize pending likes runs for engagement order #1 into organic small chunks.
-- The item below currently has 2 huge pending runs (156 + 154). Re-split into ~20 runs of ~10-22 likes
-- spread across ~12 hours with natural jitter. Executor will merge consecutive runs to meet provider min.

DO $$
DECLARE
  v_item_id uuid := '059d8140-9b01-4224-bb13-61f0c940e938';
  v_order_id uuid;
  v_total int := 310;
  v_runs int := 20;
  v_start timestamptz := now() + interval '8 minutes';
  v_end timestamptz := now() + interval '13 hours';
  v_step interval;
  v_remaining int := 310;
  v_qty int;
  v_jitter_seconds int;
  v_sched timestamptz;
  i int;
BEGIN
  SELECT order_id INTO v_order_id
  FROM organic_run_schedule
  WHERE engagement_order_item_id = v_item_id
  LIMIT 1;

  IF v_order_id IS NULL THEN
    RAISE NOTICE 'No order found for item, aborting';
    RETURN;
  END IF;

  -- Drop existing pending runs for this item
  DELETE FROM organic_run_schedule
  WHERE engagement_order_item_id = v_item_id
    AND status = 'pending';

  v_step := (v_end - v_start) / v_runs;

  FOR i IN 1..v_runs LOOP
    IF i = v_runs THEN
      v_qty := v_remaining;
    ELSE
      -- Roughly even split with +/- 40% variance
      v_qty := GREATEST(10, ROUND((v_remaining::numeric / (v_runs - i + 1)) * (0.7 + random() * 0.6))::int);
      v_qty := LEAST(v_qty, v_remaining - (v_runs - i) * 10); -- leave room for remaining min chunks
      v_qty := GREATEST(v_qty, 10);
    END IF;

    v_remaining := v_remaining - v_qty;

    v_jitter_seconds := (random() * 600 - 300)::int; -- +/- 5 min jitter
    v_sched := v_start + v_step * (i - 1) + (v_jitter_seconds || ' seconds')::interval;

    INSERT INTO organic_run_schedule (
      order_id, engagement_order_item_id, run_number,
      scheduled_at, quantity_to_send, base_quantity,
      variance_applied, peak_multiplier, status, retry_count
    ) VALUES (
      v_order_id, v_item_id, i,
      v_sched, v_qty, v_qty,
      0, 1.0, 'pending', 0
    );
  END LOOP;

  RAISE NOTICE 'Rescheduled likes into % runs', v_runs;
END $$;