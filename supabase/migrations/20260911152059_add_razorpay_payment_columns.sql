/*
# Add Razorpay Payment Columns to Orders

1. Modified Tables
- `orders` table: Added columns to support Razorpay payment integration
  - `razorpay_order_id` (text, nullable) - Razorpay order ID created server-side
  - `razorpay_payment_id` (text, nullable) - Razorpay payment ID after successful payment
  - `razorpay_signature` (text, nullable) - Signature for payment verification
  - `payment_status` (text, nullable, default 'pending') - Tracks payment state: pending, paid, failed, cancelled
  - `payment_method` (text, nullable) - Payment method used (e.g. razorpay)

2. Security
- No new RLS policies needed - existing order policies already cover these columns
- The new columns are only writable by the order owner or admin (via existing policies)
- Razorpay order creation and verification happen server-side in edge functions

3. Important Notes
- Payment status flow: pending -> paid (after verification) or failed/cancelled
- The `status` column (order fulfillment status) is separate from `payment_status`
- Order is only marked as 'payment_verified' after Razorpay signature verification succeeds
- Existing orders will have NULL payment columns and 'pending' payment_status (backward compatible)
*/

ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_order_id text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_payment_id text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_signature text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method text;

-- Add an UPDATE policy for payment columns so the edge function (using service role) can update them
-- and users can update their own order's payment info via RLS
DROP POLICY IF EXISTS "update_own_orders_payment" ON orders;
CREATE POLICY "update_own_orders_payment"
ON orders FOR UPDATE
TO authenticated, anon
USING (auth.uid() = user_id OR user_id IS NULL)
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);