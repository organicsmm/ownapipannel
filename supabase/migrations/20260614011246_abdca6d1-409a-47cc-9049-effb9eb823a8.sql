DO $outer$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('check-user-provider-status-every-minute');
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    PERFORM cron.schedule(
      'check-user-provider-status-every-minute',
      '* * * * *',
      $job$
      SELECT net.http_post(
        url := 'https://aqxniduulgvxetykysog.supabase.co/functions/v1/check-order-status',
        headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInJlZiI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInJlZiI6ImFxeG5pZHV1bGd2eGV0eWt5c29nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxMzM4MzQsImV4cCI6MjA5NTcwOTgzNH0.TETFuHB9M69gimbpKRW_ccAiTMhYEegFuuNcT4VkqWk","apikey":"eyJhbGciOiJIUzI1NiIsInJlZiI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInJlZiI6ImFxeG5pZHV1bGd2eGV0eWt5c29nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxMzM4MzQsImV4cCI6MjA5NTcwOTgzNH0.TETFuHB9M69gimbpKRW_ccAiTMhYEegFuuNcT4VkqWk"}'::jsonb,
        body := '{"cron":true,"background":true,"maxRuns":400}'::jsonb
      ) AS request_id;
      $job$
    );
  END IF;
END
$outer$;