/*
# Fix function search paths

Sets explicit search_path on trigger functions to resolve security advisor warnings.
Functions: set_updated_at, add_order_timeline_entry, add_status_timeline_entry
*/

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_order_timeline_entry()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.order_timeline (order_id, status, note)
  VALUES (NEW.id, NEW.status, 'Order placed');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_status_timeline_entry()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.order_timeline (order_id, status, note)
    VALUES (NEW.id, NEW.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$;
