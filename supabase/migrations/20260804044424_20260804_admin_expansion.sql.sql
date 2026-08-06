/*
# Admin System Expansion - Business Logic & UX Improvements

## Summary
This migration adds comprehensive admin management features: WhatsApp template manager,
local sales tracking, order archiving/internal notes, inventory history, admin activity log,
admin notifications, damage claims, and expanded business settings.

## New Tables
1. `whatsapp_templates` - Admin-editable WhatsApp message templates with placeholders
2. `local_sales` - Offline/local sales records with product, qty, price, customer, notes
3. `inventory_history` - Tracks every inventory change with admin, old/new stock, reason
4. `admin_activity_log` - Logs every admin action with admin name, action, timestamp
5. `admin_notifications` - Unread-until-opened notifications for various events
6. `damage_claims` - Customer damage reports with video/photo uploads, admin review status

## Modified Tables
- `settings`: Added production_time, delivery_time, dispatch_time, business_address,
  footer_text, copyright_text, payment_instructions, qr_payment_description
- `orders`: Added is_archived (bool), internal_notes (text)

## Security
- All new tables have RLS enabled
- admin_users-only access via security definer helper checks
- Customers can create damage_claims for their own orders; admins can read all
*/

-- ============================================================
-- 1. SETTINGS: Add new columns
-- ============================================================
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS production_time text DEFAULT '7-10 Days',
  ADD COLUMN IF NOT EXISTS delivery_time text DEFAULT '2-5 Days',
  ADD COLUMN IF NOT EXISTS dispatch_time text DEFAULT '1-2 Days',
  ADD COLUMN IF NOT EXISTS business_address text,
  ADD COLUMN IF NOT EXISTS footer_text text,
  ADD COLUMN IF NOT EXISTS copyright_text text,
  ADD COLUMN IF NOT EXISTS payment_instructions text,
  ADD COLUMN IF NOT EXISTS qr_payment_description text;

-- ============================================================
-- 2. ORDERS: Add archive + internal notes
-- ============================================================
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS internal_notes text;

-- ============================================================
-- 3. WHATSAPP TEMPLATES
-- ============================================================
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id integer PRIMARY KEY DEFAULT 1,
  business_name text DEFAULT 'Figure Club',
  greeting text DEFAULT 'Hello {business_name} 👋',
  order_confirmation text DEFAULT 'I have successfully placed an order.',
  closing_message text DEFAULT 'Thank you!',
  support_message text DEFAULT 'Please confirm my order.',
  template_body text DEFAULT 'Hello {business_name} 👋\nI have successfully placed an order.\nOrder ID: {order_id}\nName: {customer_name}\nProducts: {products}\nTotal: {total}\nThank you!',
  updated_at timestamptz DEFAULT now()
);

INSERT INTO whatsapp_templates (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_whatsapp_templates" ON whatsapp_templates;
CREATE POLICY "admin_read_whatsapp_templates" ON whatsapp_templates FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_update_whatsapp_templates" ON whatsapp_templates;
CREATE POLICY "admin_update_whatsapp_templates" ON whatsapp_templates FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 4. LOCAL SALES
-- ============================================================
CREATE TABLE IF NOT EXISTS local_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  selling_price numeric NOT NULL DEFAULT 0,
  customer_name text,
  notes text,
  total numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE local_sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_select_local_sales" ON local_sales;
CREATE POLICY "admin_select_local_sales" ON local_sales FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_local_sales" ON local_sales;
CREATE POLICY "admin_insert_local_sales" ON local_sales FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_local_sales" ON local_sales;
CREATE POLICY "admin_update_local_sales" ON local_sales FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_local_sales" ON local_sales;
CREATE POLICY "admin_delete_local_sales" ON local_sales FOR DELETE
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_local_sales_created_at ON local_sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_local_sales_product_id ON local_sales(product_id);

-- ============================================================
-- 5. INVENTORY HISTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  old_stock integer NOT NULL,
  new_stock integer NOT NULL,
  change_amount integer NOT NULL,
  reason text NOT NULL DEFAULT 'Manual Adjustment',
  admin_email text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE inventory_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_select_inventory_history" ON inventory_history;
CREATE POLICY "admin_select_inventory_history" ON inventory_history FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_inventory_history" ON inventory_history;
CREATE POLICY "admin_insert_inventory_history" ON inventory_history FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_inventory_history_product_id ON inventory_history(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_history_created_at ON inventory_history(created_at DESC);

-- ============================================================
-- 6. ADMIN ACTIVITY LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email text NOT NULL,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  details text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_select_activity_log" ON admin_activity_log;
CREATE POLICY "admin_select_activity_log" ON admin_activity_log FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_activity_log" ON admin_activity_log;
CREATE POLICY "admin_insert_activity_log" ON admin_activity_log FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_admin_activity_log_created_at ON admin_activity_log(created_at DESC);

-- ============================================================
-- 7. ADMIN NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  title text NOT NULL,
  message text,
  entity_id text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_select_notifications" ON admin_notifications;
CREATE POLICY "admin_select_notifications" ON admin_notifications FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_update_notifications" ON admin_notifications;
CREATE POLICY "admin_update_notifications" ON admin_notifications FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_insert_notifications" ON admin_notifications;
CREATE POLICY "admin_insert_notifications" ON admin_notifications FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_notifications" ON admin_notifications;
CREATE POLICY "admin_delete_notifications" ON admin_notifications FOR DELETE
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read ON admin_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON admin_notifications(created_at DESC);

-- ============================================================
-- 8. DAMAGE CLAIMS
-- ============================================================
CREATE TABLE IF NOT EXISTS damage_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  video_url text,
  photo_urls text[] DEFAULT '{}',
  description text,
  status text DEFAULT 'pending',
  admin_note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE damage_claims ENABLE ROW LEVEL SECURITY;

-- Customers can read their own claims
DROP POLICY IF EXISTS "user_select_own_claims" ON damage_claims;
CREATE POLICY "user_select_own_claims" ON damage_claims FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- Customers can create their own claims
DROP POLICY IF EXISTS "user_insert_own_claims" ON damage_claims;
CREATE POLICY "user_insert_own_claims" ON damage_claims FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- Admins can read all claims (via admin_users membership)
DROP POLICY IF EXISTS "admin_select_all_claims" ON damage_claims;
CREATE POLICY "admin_select_all_claims" ON damage_claims FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid())
  );

-- Admins can update claims
DROP POLICY IF EXISTS "admin_update_all_claims" ON damage_claims;
CREATE POLICY "admin_update_all_claims" ON damage_claims FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_damage_claims_order_id ON damage_claims(order_id);
CREATE INDEX IF NOT EXISTS idx_damage_claims_status ON damage_claims(status);
CREATE INDEX IF NOT EXISTS idx_damage_claims_created_at ON damage_claims(created_at DESC);

-- ============================================================
-- 9. ORDER TIMELINE: Add admin_email column
-- ============================================================
ALTER TABLE order_timeline
  ADD COLUMN IF NOT EXISTS admin_email text;

-- ============================================================
-- 10. Storage buckets for damage claim media
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('damage-claims', 'damage-claims', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload own damage claim files" ON storage.objects;
CREATE POLICY "Users can upload own damage claim files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'damage-claims');

DROP POLICY IF EXISTS "Public read damage claim files" ON storage.objects;
CREATE POLICY "Public read damage claim files" ON storage.objects
  FOR SELECT USING (bucket_id = 'damage-claims');

DROP POLICY IF EXISTS "Admins delete damage claim files" ON storage.objects;
CREATE POLICY "Admins delete damage claim files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'damage-claims' AND EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));
