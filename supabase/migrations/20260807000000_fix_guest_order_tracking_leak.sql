/*
  # Fix guest order tracking data leak

  ## Problem
  The previous "select_guest_orders" policy allowed the `anon` role to SELECT
  every order row where user_id IS NULL, with no scoping to a specific order.
  This meant anyone with the public anon key could read every guest order's
  name, phone, WhatsApp number, email, and address by querying the orders
  table directly.

  It also never granted anon SELECT on order_items or order_timeline, so
  guest order tracking was silently returning an empty items/timeline list
  even for the legitimate owner of the order.

  ## Fix
  1. Drop the blanket anon SELECT policy on orders.
  2. Add a SECURITY DEFINER function `track_guest_order(order_number, email)`
     that returns a single order (with items + timeline) only when BOTH the
     order number and the email on the order match exactly. This bypasses
     RLS internally but enforces the two-factor match itself, so it can't be
     used to enumerate other people's orders.
  3. No new blanket SELECT policy is added for anon on orders, order_items,
     or order_timeline — all guest access now goes through this function.
*/

-- 1. Remove the leaky policy
DROP POLICY IF EXISTS "select_guest_orders" ON orders;

-- 2. Guest order lookup function (order number + email required)
CREATE OR REPLACE FUNCTION public.track_guest_order(p_order_number text, p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_result jsonb;
BEGIN
  SELECT * INTO v_order
  FROM orders
  WHERE order_number = p_order_number
    AND lower(email) = lower(p_email)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT to_jsonb(v_order)
    || jsonb_build_object(
         'order_items', COALESCE((
           SELECT jsonb_agg(oi) FROM order_items oi WHERE oi.order_id = v_order.id
         ), '[]'::jsonb),
         'order_timeline', COALESCE((
           SELECT jsonb_agg(ot ORDER BY ot.created_at) FROM order_timeline ot WHERE ot.order_id = v_order.id
         ), '[]'::jsonb)
       )
  INTO v_result;

  RETURN v_result;
END;
$$;

-- Let anyone call the function itself — access is still gated by the
-- order_number + email match inside it, not by table-level RLS.
GRANT EXECUTE ON FUNCTION public.track_guest_order(text, text) TO anon, authenticated;
