CREATE OR REPLACE FUNCTION public.prevent_duplicate_active_user_engagement_item()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  _new_order public.engagement_orders%ROWTYPE;
  _existing_order_number integer;
BEGIN
  SELECT * INTO _new_order
  FROM public.engagement_orders
  WHERE id = NEW.engagement_order_id;

  IF NOT FOUND OR COALESCE(_new_order.use_user_api, false) = false THEN
    RETURN NEW;
  END IF;

  IF _new_order.status NOT IN ('pending', 'processing', 'paused') THEN
    RETURN NEW;
  END IF;

  SELECT eo.order_number INTO _existing_order_number
  FROM public.engagement_order_items eoi
  JOIN public.engagement_orders eo ON eo.id = eoi.engagement_order_id
  WHERE eo.id <> NEW.engagement_order_id
    AND eo.user_id = _new_order.user_id
    AND eo.user_bundle_id IS NOT DISTINCT FROM _new_order.user_bundle_id
    AND eo.link = _new_order.link
    AND COALESCE(eo.use_user_api, false) = true
    AND eo.status IN ('pending', 'processing', 'paused')
    AND eoi.engagement_type = NEW.engagement_type
    AND eoi.status <> 'cancelled'
  ORDER BY eo.created_at ASC
  LIMIT 1;

  IF _existing_order_number IS NOT NULL THEN
    RAISE EXCEPTION 'Same link ka % order already active hai: #% ', NEW.engagement_type, _existing_order_number;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS prevent_duplicate_active_user_engagement_item_trigger ON public.engagement_order_items;
CREATE TRIGGER prevent_duplicate_active_user_engagement_item_trigger
BEFORE INSERT ON public.engagement_order_items
FOR EACH ROW
EXECUTE FUNCTION public.prevent_duplicate_active_user_engagement_item();