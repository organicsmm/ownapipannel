select cron.unschedule('check-user-provider-status-every-minute')
where exists (select 1 from cron.job where jobname = 'check-user-provider-status-every-minute');

select cron.schedule(
  'check-user-provider-status-every-minute',
  '* * * * *',
  $$
    SELECT net.http_post(
      url := 'https://aqxniduulgvxetykysog.supabase.co/functions/v1/check-order-status',
      headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInJlZiI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInJlZiI6ImFxeG5pZHV1bGd2eGV0eWt5c29nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxMzM4MzQsImV4cCI6MjA5NTcwOTgzNH0.TETFuHB9M69gimbpKRW_ccAiTMhYEegFuuNcT4VkqWk","apikey":"eyJhbGciOiJIUzI1NiIsInJlZiI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInJlZiI6ImFxeG5pZHV1bGd2eGV0eWt5c29nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxMzM4MzQsImV4cCI6MjA5NTcwOTgzNH0.TETFuHB9M69gimbpKRW_ccAiTMhYEegFuuNcT4VkqWk"}'::jsonb,
      body := '{"cron":true,"background":true,"maxRuns":1000}'::jsonb
    ) AS request_id;
  $$
);