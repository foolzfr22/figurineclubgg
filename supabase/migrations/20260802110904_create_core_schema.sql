/*
# Figure Club Core Schema

## Overview
Complete e-commerce database for a resin anime & gaming figure brand.
Supports customer accounts, products, orders, reviews, wishlist, cart,
addresses, messages, newsletter, analytics, inventory, admin users, and settings.

## New Tables
1. profiles — customer profile data linked to auth.users
2. admin_users — admin role flag for users (server-controlled)
3. categories — product categories (Anime, Games, Movies, Manga, etc.)
4. products — catalog of figures with full metadata
5. product_images — multiple images per product (ordered)
6. orders — customer orders with shipping & contact info
7. order_items — line items per order
8. order_timeline — status history per order (for tracking)
9. reviews — product reviews with photos, videos, admin reply
10. wishlist — saved products per customer
11. cart — persistent cart per customer
12. cart_items — items in cart
13. addresses — multiple saved addresses per customer
14. messages — contact form submissions
15. newsletter — email subscribers
16. analytics — daily visitor/sales metrics
17. coupons — discount codes
18. settings — site-wide configuration (singleton row)
19. recently_viewed — recently viewed products per customer

## Security
- RLS enabled on every table.
- Customer tables: owner-scoped via auth.uid() = user_id.
- Public read on products, categories, reviews (anon can browse catalog).
- Orders: only owner can read/insert their orders.
- Settings: public read, admin write.
- Newsletter: public insert (subscribe), admin read.
- Messages: public insert (contact form), admin read.
*/

-- ============ PROFILES ============
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============ ADMIN USERS ============
CREATE TABLE IF NOT EXISTS admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin','super_admin')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_own_admin_row" ON admin_users;
CREATE POLICY "read_own_admin_row" ON admin_users FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- ============ CATEGORIES ============
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  image_url text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_categories" ON categories;
CREATE POLICY "public_read_categories" ON categories FOR SELECT
  TO anon, authenticated USING (true);

-- ============ PRODUCTS ============
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  discount_price numeric(10,2),
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  material text,
  weight text,
  height text,
  edition text,
  sku text UNIQUE,
  stock int NOT NULL DEFAULT 0,
  rating numeric(2,1) DEFAULT 0,
  review_count int DEFAULT 0,
  is_featured boolean DEFAULT false,
  is_best_seller boolean DEFAULT false,
  is_limited_edition boolean DEFAULT false,
  is_new_arrival boolean DEFAULT false,
  is_trending boolean DEFAULT false,
  is_hidden boolean DEFAULT false,
  is_preorder boolean DEFAULT false,
  production_time text,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_products" ON products;
CREATE POLICY "public_read_products" ON products FOR SELECT
  TO anon, authenticated USING (is_hidden = false);

-- ============ PRODUCT IMAGES ============
CREATE TABLE IF NOT EXISTS product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_product_images" ON product_images;
CREATE POLICY "public_read_product_images" ON product_images FOR SELECT
  TO anon, authenticated USING (true);

-- ============ ORDERS ============
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  phone text NOT NULL,
  whatsapp_number text NOT NULL,
  email text NOT NULL,
  address text NOT NULL,
  state text NOT NULL,
  city text NOT NULL,
  pin_code text NOT NULL,
  landmark text,
  notes text,
  gift_wrap boolean DEFAULT false,
  custom_paint_request text,
  save_address boolean DEFAULT false,
  create_account boolean DEFAULT false,
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  shipping numeric(10,2) NOT NULL DEFAULT 0,
  discount numeric(10,2) NOT NULL DEFAULT 0,
  grand_total numeric(10,2) NOT NULL DEFAULT 0,
  coupon_code text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','printing','painting','quality_check','packaging','ready_to_ship','shipped','delivered','cancelled','refunded')),
  estimated_delivery date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_orders" ON orders;
CREATE POLICY "select_own_orders" ON orders FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_orders" ON orders;
CREATE POLICY "insert_own_orders" ON orders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============ ORDER ITEMS ============
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  product_image text,
  quantity int NOT NULL DEFAULT 1,
  price numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_order_items" ON order_items;
CREATE POLICY "select_own_order_items" ON order_items FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
  );

-- ============ ORDER TIMELINE ============
CREATE TABLE IF NOT EXISTS order_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  note text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE order_timeline ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_order_timeline" ON order_timeline;
CREATE POLICY "select_own_order_timeline" ON order_timeline FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_timeline.order_id AND orders.user_id = auth.uid())
  );

-- ============ REVIEWS ============
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  rating int NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  title text,
  body text,
  image_urls text[] DEFAULT '{}',
  video_url text,
  is_verified_purchase boolean DEFAULT false,
  is_approved boolean DEFAULT false,
  admin_reply text,
  helpful_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_approved_reviews" ON reviews;
CREATE POLICY "public_read_approved_reviews" ON reviews FOR SELECT
  TO anon, authenticated USING (is_approved = true);
DROP POLICY IF EXISTS "insert_own_review" ON reviews;
CREATE POLICY "insert_own_review" ON reviews FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_review" ON reviews;
CREATE POLICY "update_own_review" ON reviews FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ WISHLIST ============
CREATE TABLE IF NOT EXISTS wishlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, product_id)
);
ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_wishlist" ON wishlist;
CREATE POLICY "select_own_wishlist" ON wishlist FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_wishlist" ON wishlist;
CREATE POLICY "insert_own_wishlist" ON wishlist FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_wishlist" ON wishlist;
CREATE POLICY "delete_own_wishlist" ON wishlist FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ CART ============
CREATE TABLE IF NOT EXISTS cart (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id)
);
ALTER TABLE cart ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_cart" ON cart;
CREATE POLICY "select_own_cart" ON cart FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_cart" ON cart;
CREATE POLICY "insert_own_cart" ON cart FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_cart" ON cart;
CREATE POLICY "update_own_cart" ON cart FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_cart" ON cart;
CREATE POLICY "delete_own_cart" ON cart FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ CART ITEMS ============
CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id uuid NOT NULL REFERENCES cart(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity int NOT NULL DEFAULT 1,
  gift_wrap boolean DEFAULT false,
  custom_paint_request text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (cart_id, product_id)
);
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_cart_items" ON cart_items;
CREATE POLICY "select_own_cart_items" ON cart_items FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM cart WHERE cart.id = cart_items.cart_id AND cart.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "insert_own_cart_items" ON cart_items;
CREATE POLICY "insert_own_cart_items" ON cart_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM cart WHERE cart.id = cart_items.cart_id AND cart.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "update_own_cart_items" ON cart_items;
CREATE POLICY "update_own_cart_items" ON cart_items FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM cart WHERE cart.id = cart_items.cart_id AND cart.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM cart WHERE cart.id = cart_items.cart_id AND cart.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "delete_own_cart_items" ON cart_items;
CREATE POLICY "delete_own_cart_items" ON cart_items FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM cart WHERE cart.id = cart_items.cart_id AND cart.user_id = auth.uid())
  );

-- ============ ADDRESSES ============
CREATE TABLE IF NOT EXISTS addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  label text,
  full_name text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  state text NOT NULL,
  city text NOT NULL,
  pin_code text NOT NULL,
  landmark text,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_addresses" ON addresses;
CREATE POLICY "select_own_addresses" ON addresses FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_addresses" ON addresses;
CREATE POLICY "insert_own_addresses" ON addresses FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_addresses" ON addresses;
CREATE POLICY "update_own_addresses" ON addresses FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_addresses" ON addresses;
CREATE POLICY "delete_own_addresses" ON addresses FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ MESSAGES ============
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subject text,
  body text NOT NULL,
  is_read boolean DEFAULT false,
  admin_reply text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_insert_messages" ON messages;
CREATE POLICY "public_insert_messages" ON messages FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- ============ NEWSLETTER ============
CREATE TABLE IF NOT EXISTS newsletter (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE newsletter ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_insert_newsletter" ON newsletter;
CREATE POLICY "public_insert_newsletter" ON newsletter FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- ============ ANALYTICS ============
CREATE TABLE IF NOT EXISTS analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  visitors int DEFAULT 0,
  page_views int DEFAULT 0,
  orders int DEFAULT 0,
  revenue numeric(10,2) DEFAULT 0,
  UNIQUE (date)
);
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;

-- ============ COUPONS ============
CREATE TABLE IF NOT EXISTS coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent','fixed')),
  discount_value numeric(10,2) NOT NULL DEFAULT 0,
  min_order numeric(10,2) DEFAULT 0,
  max_uses int,
  used_count int DEFAULT 0,
  is_active boolean DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_active_coupons" ON coupons;
CREATE POLICY "public_read_active_coupons" ON coupons FOR SELECT
  TO anon, authenticated USING (is_active = true);

-- ============ SETTINGS (singleton) ============
CREATE TABLE IF NOT EXISTS settings (
  id int PRIMARY KEY DEFAULT 1,
  business_name text NOT NULL DEFAULT 'Figure Club',
  logo_url text,
  favicon_url text,
  banner_url text,
  shipping_flat numeric(10,2) DEFAULT 0,
  shipping_free_over numeric(10,2) DEFAULT 5000,
  support_email text,
  support_phone text,
  whatsapp_number text,
  instagram_url text,
  facebook_url text,
  youtube_url text,
  privacy_policy text,
  terms text,
  refund_policy text,
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT singleton CHECK (id = 1)
);
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_settings" ON settings;
CREATE POLICY "public_read_settings" ON settings FOR SELECT
  TO anon, authenticated USING (true);

-- ============ RECENTLY VIEWED ============
CREATE TABLE IF NOT EXISTS recently_viewed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  viewed_at timestamptz DEFAULT now(),
  UNIQUE (user_id, product_id)
);
ALTER TABLE recently_viewed ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_recently_viewed" ON recently_viewed;
CREATE POLICY "select_own_recently_viewed" ON recently_viewed FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_recently_viewed" ON recently_viewed;
CREATE POLICY "insert_own_recently_viewed" ON recently_viewed FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_recently_viewed" ON recently_viewed;
CREATE POLICY "delete_own_recently_viewed" ON recently_viewed FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_user ON cart(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- ============ TRIGGERS ============
-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON profiles;
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS products_set_updated_at ON products;
CREATE TRIGGER products_set_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS orders_set_updated_at ON orders;
CREATE TRIGGER orders_set_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-add order timeline entry on order insert
CREATE OR REPLACE FUNCTION public.add_order_timeline_entry()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.order_timeline (order_id, status, note)
  VALUES (NEW.id, NEW.status, 'Order placed');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_add_timeline ON orders;
CREATE TRIGGER orders_add_timeline AFTER INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION public.add_order_timeline_entry();

-- Auto-add timeline entry on order status change
CREATE OR REPLACE FUNCTION public.add_status_timeline_entry()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.order_timeline (order_id, status, note)
    VALUES (NEW.id, NEW.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_status_timeline ON orders;
CREATE TRIGGER orders_status_timeline AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION public.add_status_timeline_entry();

-- Seed default settings row
INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Seed default categories
INSERT INTO categories (name, slug, sort_order) VALUES
  ('Anime', 'anime', 1),
  ('Games', 'games', 2),
  ('Movies', 'movies', 3),
  ('Manga', 'manga', 4),
  ('Premium Figures', 'premium-figures', 5),
  ('Statues', 'statues', 6),
  ('Chibi Figures', 'chibi-figures', 7)
ON CONFLICT (slug) DO NOTHING;
