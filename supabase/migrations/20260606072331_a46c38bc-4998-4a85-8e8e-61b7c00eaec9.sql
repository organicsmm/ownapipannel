
-- Per-engagement-type max batch caps (must match process-engagement-order)
DO $$
DECLARE
  r RECORD;
  cap INT;
  interval_min INT;
  remaining INT;
  qty INT;
  next_run INT;
  next_time TIMESTAMPTZ;
  base_time TIMESTAMPTZ;
  i INT;
BEGIN
  FOR r IN
    SELECT ors.id, ors.engagement_order_item_id, ors.quantity_to_send,
           ors.scheduled_at, ors.run_number, eoi.engagement_type
    FROM organic_run_schedule ors
    JOIN engagement_order_items eoi ON eoi.id = ors.engagement_order_item_id
    WHERE ors.status = 'pending'
      AND ors.quantity_to_send > CASE eoi.engagement_type
            WHEN 'views' THEN 400
            WHEN 'likes' THEN 50
            WHEN 'comments' THEN 5
            WHEN 'saves' THEN 30
            WHEN 'shares' THEN 35
            WHEN 'followers' THEN 12
            WHEN 'subscribers' THEN 8
            WHEN 'retweets' THEN 50
            WHEN 'reposts' THEN 40
            WHEN 'watch_hours' THEN 2
            ELSE 60
          END
  LOOP
    cap := CASE r.engagement_type
            WHEN 'views' THEN 400
            WHEN 'likes' THEN 50
            WHEN 'comments' THEN 5
            WHEN 'saves' THEN 30
            WHEN 'shares' THEN 35
            WHEN 'followers' THEN 12
            WHEN 'subscribers' THEN 8
            WHEN 'retweets' THEN 50
            WHEN 'reposts' THEN 40
            WHEN 'watch_hours' THEN 2
            ELSE 60
          END;
    interval_min := CASE r.engagement_type
            WHEN 'views' THEN 4
            WHEN 'likes' THEN 6
            WHEN 'comments' THEN 12
            WHEN 'watch_hours' THEN 60
            ELSE 5
          END;
    remaining := r.quantity_to_send;
    base_time := r.scheduled_at;

    -- Trim original entry to cap
    UPDATE organic_run_schedule
       SET quantity_to_send = cap,
           base_quantity = cap
     WHERE id = r.id;
    remaining := remaining - cap;

    -- Pick next available run_number
    SELECT COALESCE(MAX(run_number), 0) + 1
      INTO next_run
      FROM organic_run_schedule
     WHERE engagement_order_item_id = r.engagement_order_item_id;

    next_time := base_time;
    i := 0;
    WHILE remaining > 0 AND i < 5000 LOOP
      qty := LEAST(remaining, cap);
      next_time := next_time + (interval_min || ' minutes')::interval;
      INSERT INTO organic_run_schedule
        (engagement_order_item_id, run_number, scheduled_at,
         quantity_to_send, base_quantity, status)
      VALUES
        (r.engagement_order_item_id, next_run, next_time, qty, qty, 'pending');
      next_run := next_run + 1;
      remaining := remaining - qty;
      i := i + 1;
    END LOOP;
  END LOOP;
END $$;
