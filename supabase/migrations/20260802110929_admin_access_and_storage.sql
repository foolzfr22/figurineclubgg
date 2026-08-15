/*
# Admin Access Control & Storage Setup

## Overview
Creates SECURITY DEFINER functions that allow admin users to manage all
e-commerce data (products, orders, reviews, messages, newsletter, coupons,
settings, analytics, categories) through verified admin role checks.
Also creates storage buckets for product images, review images, and profile pictures.

## Security
- All admin mutation functions check admin_users table for the calling user.
- Functions are SECURITY DEFINER so they run with elevated privileges.
- Storage buckets are public-read (images need to load in browser) but only
  authenticated users can upload to their own folders.
*/

-- ============ ADMIN CHECK FUNCTION ============
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  );
$$;

-- ============ ADMIN POLICIES ON TABLES ============
-- Products: admin can do everything (including hidden), public can read non-hidden (already set)
-- We add admin policies using is_admin() check.
DROP POLICY IF EXISTS "admin_all_products" ON products;
CREATE POLICY "admin_all_products" ON products FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_all_product_images" ON product_images;
CREATE POLICY "admin_all_product_images" ON product_images FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_all_categories" ON categories;
CREATE POLICY "admin_all_categories" ON categories FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_all_orders" ON orders;
CREATE POLICY "admin_all_orders" ON orders FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_all_order_items" ON order_items;
CREATE POLICY "admin_all_order_items" ON order_items FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_all_order_timeline" ON order_timeline;
CREATE POLICY "admin_all_order_timeline" ON order_timeline FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_all_reviews" ON reviews;
CREATE POLICY "admin_all_reviews" ON reviews FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_all_messages" ON messages;
CREATE POLICY "admin_all_messages" ON messages FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_all_newsletter" ON newsletter;
CREATE POLICY "admin_all_newsletter" ON newsletter FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_all_coupons" ON coupons;
CREATE POLICY "admin_all_coupons" ON coupons FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_all_settings" ON settings;
CREATE POLICY "admin_all_settings" ON settings FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_all_analytics" ON analytics;
CREATE POLICY "admin_all_analytics" ON analytics FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Profiles: admin can read all profiles (for customer management)
DROP POLICY IF EXISTS "admin_read_all_profiles" ON profiles;
CREATE POLICY "admin_read_all_profiles" ON profiles FOR SELECT
  TO authenticated USING (public.is_admin());

-- ============ STORAGE BUCKETS ============
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('product-images', 'product-images', true),
  ('review-images', 'review-images', true),
  ('profile-pictures', 'profile-pictures', true),
  ('brand-assets', 'brand-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: anyone can read (public buckets), authenticated can upload
-- Product images: admin only
DROP POLICY IF EXISTS "product_images_read" ON storage.objects;
CREATE POLICY "product_images_read" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "product_images_admin_write" ON storage.objects;
CREATE POLICY "product_images_admin_write" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

DROP POLICY IF EXISTS "product_images_admin_update" ON storage.objects;
CREATE POLICY "product_images_admin_update" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'product-images' AND public.is_admin());

DROP POLICY IF EXISTS "product_images_admin_delete" ON storage.objects;
CREATE POLICY "product_images_admin_delete" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'product-images' AND public.is_admin());

-- Review images: any authenticated user can upload (they're writing a review)
DROP POLICY IF EXISTS "review_images_read" ON storage.objects;
CREATE POLICY "review_images_read" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'review-images');

DROP POLICY IF EXISTS "review_images_user_write" ON storage.objects;
CREATE POLICY "review_images_user_write" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'review-images');

DROP POLICY IF EXISTS "review_images_owner_delete" ON storage.objects;
CREATE POLICY "review_images_owner_delete" ON storage.objects FOR DELETE
  TO authenticated USING (
    bucket_id = 'review-images' AND auth.uid() = owner
  );

-- Profile pictures: owner can manage their own
DROP POLICY IF EXISTS "profile_pictures_read" ON storage.objects;
CREATE POLICY "profile_pictures_read" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'profile-pictures');

DROP POLICY IF EXISTS "profile_pictures_owner_write" ON storage.objects;
CREATE POLICY "profile_pictures_owner_write" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'profile-pictures' AND auth.uid() = owner);

DROP POLICY IF EXISTS "profile_pictures_owner_update" ON storage.objects;
CREATE POLICY "profile_pictures_owner_update" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'profile-pictures' AND auth.uid() = owner);

DROP POLICY IF EXISTS "profile_pictures_owner_delete" ON storage.objects;
CREATE POLICY "profile_pictures_owner_delete" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'profile-pictures' AND auth.uid() = owner);

-- Brand assets (logo, banner, favicon): admin only
DROP POLICY IF EXISTS "brand_assets_read" ON storage.objects;
CREATE POLICY "brand_assets_read" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'brand-assets');

DROP POLICY IF EXISTS "brand_assets_admin_write" ON storage.objects;
CREATE POLICY "brand_assets_admin_write" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'brand-assets' AND public.is_admin());

DROP POLICY IF EXISTS "brand_assets_admin_update" ON storage.objects;
CREATE POLICY "brand_assets_admin_update" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'brand-assets' AND public.is_admin());

DROP POLICY IF EXISTS "brand_assets_admin_delete" ON storage.objects;
CREATE POLICY "brand_assets_admin_delete" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'brand-assets' AND public.is_admin());
