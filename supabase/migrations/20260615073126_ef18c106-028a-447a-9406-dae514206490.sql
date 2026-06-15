
ALTER TABLE public.engagement_orders REPLICA IDENTITY FULL;
ALTER TABLE public.engagement_order_items REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.engagement_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.engagement_order_items;
