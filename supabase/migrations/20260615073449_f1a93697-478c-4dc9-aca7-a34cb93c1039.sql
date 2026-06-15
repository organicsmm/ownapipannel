
-- 1) Add column (nullable first for backfill)
ALTER TABLE public.engagement_order_items
  ADD COLUMN IF NOT EXISTS user_id uuid;

-- 2) Backfill from parent order
UPDATE public.engagement_order_items eoi
SET user_id = eo.user_id
FROM public.engagement_orders eo
WHERE eo.id = eoi.engagement_order_id
  AND eoi.user_id IS DISTINCT FROM eo.user_id;

-- 3) Enforce NOT NULL going forward
ALTER TABLE public.engagement_order_items
  ALTER COLUMN user_id SET NOT NULL;

-- 4) Index for fast filter
CREATE INDEX IF NOT EXISTS engagement_order_items_user_id_idx
  ON public.engagement_order_items(user_id);

-- 5) Trigger: keep user_id in sync from parent order on insert/update
CREATE OR REPLACE FUNCTION public.set_engagement_order_item_user_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NULL
     OR (TG_OP = 'UPDATE' AND NEW.engagement_order_id IS DISTINCT FROM OLD.engagement_order_id) THEN
    SELECT eo.user_id INTO NEW.user_id
    FROM public.engagement_orders eo
    WHERE eo.id = NEW.engagement_order_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_engagement_order_item_user_id ON public.engagement_order_items;
CREATE TRIGGER trg_set_engagement_order_item_user_id
BEFORE INSERT OR UPDATE OF engagement_order_id ON public.engagement_order_items
FOR EACH ROW EXECUTE FUNCTION public.set_engagement_order_item_user_id();
