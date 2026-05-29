-- Performance indexes for hot query paths. Safe additive change — no schema/logic modified.

-- organic_run_schedule: cron picks due pending runs; UI fetches by order/item
CREATE INDEX IF NOT EXISTS idx_ors_status_scheduled_at
  ON public.organic_run_schedule (status, scheduled_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_ors_order_id_status
  ON public.organic_run_schedule (order_id, status);

CREATE INDEX IF NOT EXISTS idx_ors_item_id_run_number
  ON public.organic_run_schedule (engagement_order_item_id, run_number);

CREATE INDEX IF NOT EXISTS idx_ors_item_id_status
  ON public.organic_run_schedule (engagement_order_item_id, status);

-- orders: organic worker filter + user listings
CREATE INDEX IF NOT EXISTS idx_orders_organic_status
  ON public.orders (status)
  WHERE is_organic_mode = true;

CREATE INDEX IF NOT EXISTS idx_orders_user_created
  ON public.orders (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_service_id
  ON public.orders (service_id);

-- engagement_orders: user listings + cleanup job
CREATE INDEX IF NOT EXISTS idx_eo_user_created
  ON public.engagement_orders (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_eo_status_completed
  ON public.engagement_orders (status, completed_at);

CREATE INDEX IF NOT EXISTS idx_eo_order_number
  ON public.engagement_orders (order_number);

-- engagement_order_items: join from order, status filter
CREATE INDEX IF NOT EXISTS idx_eoi_order_id
  ON public.engagement_order_items (engagement_order_id);

CREATE INDEX IF NOT EXISTS idx_eoi_status
  ON public.engagement_order_items (status);

CREATE INDEX IF NOT EXISTS idx_eoi_service_id
  ON public.engagement_order_items (service_id);

-- transactions: wallet history + revenue queries
CREATE INDEX IF NOT EXISTS idx_tx_user_created
  ON public.transactions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tx_type_status
  ON public.transactions (type, status);

CREATE INDEX IF NOT EXISTS idx_tx_order_id
  ON public.transactions (order_id);

-- chat: conversation listings + message feed
CREATE INDEX IF NOT EXISTS idx_chat_msg_conv_created
  ON public.chat_messages (conversation_id, created_at);

CREATE INDEX IF NOT EXISTS idx_chat_conv_user_last
  ON public.chat_conversations (user_id, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_conv_status
  ON public.chat_conversations (status);

-- services: active filter + lookups
CREATE INDEX IF NOT EXISTS idx_services_active_category
  ON public.services (category)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_services_provider
  ON public.services (provider_id, provider_service_id);

-- user_roles: has_role() hot path
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role
  ON public.user_roles (user_id, role);

-- wallets: user lookups
CREATE INDEX IF NOT EXISTS idx_wallets_user_id
  ON public.wallets (user_id);

-- deposits: admin queue + user history
CREATE INDEX IF NOT EXISTS idx_deposits_status_created
  ON public.deposits (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_deposits_user_created
  ON public.deposits (user_id, created_at DESC);

-- service_provider_mapping: provider rotation lookup
CREATE INDEX IF NOT EXISTS idx_spm_service_active
  ON public.service_provider_mapping (service_id, is_active, sort_order);

-- provider_accounts: active rotation
CREATE INDEX IF NOT EXISTS idx_pa_provider_active
  ON public.provider_accounts (provider_id, is_active, priority);

-- subscriptions
CREATE INDEX IF NOT EXISTS idx_subs_user_status
  ON public.subscriptions (user_id, status);

-- support tickets
CREATE INDEX IF NOT EXISTS idx_tickets_user_status
  ON public.support_tickets (user_id, status, created_at DESC);

ANALYZE;