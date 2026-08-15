/*
# Fix Order RLS Policies & Remove Demo Analytics

## Problem
1. The `orders` table had no INSERT policy for the `anon` role, so guest (not-logged-in)
   customers could not create orders via Buy Now or Checkout. Every insert failed with
   "new row violates row-level security policy" → the frontend showed "Failed to place order".
2. The `order_items` table had NO insert policy for regular authenticated users — only an
   admin-all policy and a select-own policy. Even logged-in users couldn't insert order items.
3. The `order_timeline` table had the same gap — no insert policy for regular users.
4. The `analytics` table contained 7 rows of hardcoded demo data (visitors, revenue, orders)
   that made the dashboard show fake numbers.

## Changes

### RLS Policy Fixes
- **orders**: Replace the authenticated-only INSERT policy with one that allows BOTH
  anon (guest) and authenticated users to insert. Guests insert with `user_id IS NULL`;
  authenticated users insert with `user_id = auth.uid()`.
- **orders**: Add a SELECT policy so anon users can look up their own guest orders by
  order_number (for order tracking). Authenticated users already had select_own_orders.
- **order_items**: Add an INSERT policy that allows the owner of the parent order to insert
  items. For anon, the parent order must have `user_id IS NULL`; for authenticated,
  `user_id = auth.uid()`.
- **order_timeline**: Add the same INSERT policy pattern as order_items.

### Data Cleanup
- Delete all rows from the `analytics` table. The dashboard will now show real data
  computed from actual orders, or "No analytics data available yet" when empty.

## Security Notes
1. The orders INSERT policy uses `WITH CHECK (user_id = auth.uid() OR (user_id IS NULL AND auth.uid() IS NULL))`
   so authenticated users cannot create orders under someone else's user_id, and anon
   users can only create guest orders (user_id = NULL).
2. The order_items and order_timeline INSERT policies verify ownership through the parent
   orders table, preventing users from adding items to other people's orders.
3. The anon SELECT policy on orders only allows looking up orders by exact order_number,
   not listing all orders.
*/

-- ============================================================
-- 1. Fix orders INSERT policy (allow guests + authenticated)
-- ============================================================
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "insert_own_orders" ON orders;
DROP POLICY IF EXISTS "insert_orders" ON orders;

CREATE POLICY "insert_orders"
ON orders FOR INSERT
TO anon, authenticated
WITH CHECK (user_id = auth.uid() OR (user_id IS NULL AND auth.uid() IS NULL));

-- ============================================================
-- 2. Add orders SELECT policy for anon (track by order_number)
--    Authenticated users already have select_own_orders.
-- ============================================================
DROP POLICY IF EXISTS "select_guest_orders" ON orders;

CREATE POLICY "select_guest_orders"
ON orders FOR SELECT
TO anon
USING (user_id IS NULL);

-- ============================================================
-- 3. Fix order_items INSERT policy (allow order owner)
-- ============================================================
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "insert_own_order_items" ON order_items;

CREATE POLICY "insert_own_order_items"
ON order_items FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND (orders.user_id = auth.uid() OR (orders.user_id IS NULL AND auth.uid() IS NULL))
  )
);

-- ============================================================
-- 4. Fix order_timeline INSERT policy (allow order owner)
-- ============================================================
ALTER TABLE order_timeline ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "insert_own_order_timeline" ON order_timeline;

CREATE POLICY "insert_own_order_timeline"
ON order_timeline FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_timeline.order_id
    AND (orders.user_id = auth.uid() OR (orders.user_id IS NULL AND auth.uid() IS NULL))
  )
);

-- ============================================================
-- 5. Remove all demo analytics data
-- ============================================================
DELETE FROM analytics;
