-- ============================================================
-- PERFORMANCE INDEXES for high-volume order processing
-- ============================================================

-- 1. Executor query: WHERE status='pending' AND scheduled_at<=now() ORDER BY scheduled_at
-- Currently the slowest query in the project (3.8M ms total). Partial index makes it O(log n).
CREATE INDEX IF NOT EXISTS idx_ors_pending_scheduled
  ON public.organic_run_schedule (scheduled_at ASC)
  WHERE status = 'pending';

-- 2. Status-check query: WHERE status='started' AND provider_order_id NOT NULL
--    ORDER BY last_status_check NULLS FIRST
CREATE INDEX IF NOT EXISTS idx_ors_started_status_check
  ON public.organic_run_schedule (last_status_check ASC NULLS FIRST)
  WHERE status = 'started' AND provider_order_id IS NOT NULL;

-- 3. Per-item runs lookup (used for progress, status sync, cleanup)
CREATE INDEX IF NOT EXISTS idx_ors_item_status
  ON public.organic_run_schedule (engagement_order_item_id, status);

-- 4. Provider rotation: filter by item + active, order by priority
CREATE INDEX IF NOT EXISTS idx_ubip_item_active_priority
  ON public.user_bundle_item_providers (user_bundle_item_id, is_active, priority);

-- 5. Bundle item lookup by type (executor uses this a lot)
CREATE INDEX IF NOT EXISTS idx_ubi_bundle_type
  ON public.user_bundle_items (user_bundle_id, engagement_type);

-- 6. Engagement order items by parent + type (duplicate-check trigger + listings)
CREATE INDEX IF NOT EXISTS idx_eoi_order_type
  ON public.engagement_order_items (engagement_order_id, engagement_type);

-- 7. User's recent engagement orders list
CREATE INDEX IF NOT EXISTS idx_eo_user_created
  ON public.engagement_orders (user_id, created_at DESC);

-- 8. Duplicate-check trigger: link + use_user_api + status
CREATE INDEX IF NOT EXISTS idx_eo_user_link_active
  ON public.engagement_orders (user_id, link)
  WHERE use_user_api = true AND status IN ('pending','processing','paused');

-- 9. Mass order batch items by batch + status (for history dashboard filters)
CREATE INDEX IF NOT EXISTS idx_mass_batch_items_batch_status
  ON public.mass_order_batch_items (batch_id, status);

-- 10. Refresh planner statistics so it actually uses the new indexes immediately
ANALYZE public.organic_run_schedule;
ANALYZE public.engagement_order_items;
ANALYZE public.engagement_orders;
ANALYZE public.user_bundle_items;
ANALYZE public.user_bundle_item_providers;
ANALYZE public.mass_order_batch_items;