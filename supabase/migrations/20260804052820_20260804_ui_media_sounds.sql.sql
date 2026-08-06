/*
# UI Media & Sound Manager

## Summary
Adds admin-editable UI animations (GIF/Lottie/MP4/WebM) and sound effects (MP3/WAV/OGG/M4A)
that replace hardcoded media throughout the website. Admins can upload, preview, replace,
and delete media/sounds through the Admin Dashboard.

## New Tables
1. `ui_media` - Stores media URLs for success, cancellation, damage, empty cart, empty wishlist,
   no search results, offline/error, and 404 animations. Each row has a key, media_url, media_type
   (gif/lottie/mp4/webm), and updated_at.
2. `ui_sounds` - Stores sound effect URLs and settings. Each row has a key, sound_url, enabled flag,
   and volume. Also includes a global master_enabled and master_volume in a singleton row.

## Security
- RLS enabled on both tables
- All authenticated users can read (needed for customer-facing media/sounds)
- Only admin_users can insert/update/delete (enforced via admin_users membership check)
*/

-- ============================================================
-- 1. UI MEDIA TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS ui_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  media_url text,
  media_type text DEFAULT 'none',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ui_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_read_ui_media" ON ui_media;
CREATE POLICY "auth_read_ui_media" ON ui_media FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "anon_read_ui_media" ON ui_media;
CREATE POLICY "anon_read_ui_media" ON ui_media FOR SELECT
  TO anon USING (true);

DROP POLICY IF EXISTS "admin_write_ui_media" ON ui_media;
CREATE POLICY "admin_write_ui_media" ON ui_media FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid())
  );

-- Seed default rows (media_url null = use built-in default animation)
INSERT INTO ui_media (key, label, media_type) VALUES
  ('success', 'Order Success Animation', 'none'),
  ('cancellation', 'Cancellation Animation', 'none'),
  ('damage', 'Damage Claim Animation', 'none'),
  ('empty_cart', 'Empty Cart Animation', 'none'),
  ('empty_wishlist', 'Empty Wishlist Animation', 'none'),
  ('no_results', 'No Search Results Animation', 'none'),
  ('offline_error', 'Offline / Error Animation', 'none'),
  ('not_found', 'Page Not Found Animation', 'none')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 2. UI SOUNDS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS ui_sounds (
  id integer PRIMARY KEY DEFAULT 1,
  master_enabled boolean DEFAULT true,
  master_volume integer DEFAULT 70,
  -- Individual sound settings stored as JSON
  sounds jsonb DEFAULT '{
    "order_success": {"url": null, "enabled": true, "volume": 80},
    "cancellation": {"url": null, "enabled": true, "volume": 70},
    "add_to_cart": {"url": null, "enabled": true, "volume": 60},
    "remove_from_cart": {"url": null, "enabled": true, "volume": 50},
    "notification": {"url": null, "enabled": true, "volume": 60},
    "error": {"url": null, "enabled": true, "volume": 70},
    "payment_verified": {"url": null, "enabled": true, "volume": 80},
    "package_shipped": {"url": null, "enabled": true, "volume": 70},
    "package_delivered": {"url": null, "enabled": true, "volume": 80}
  }'::jsonb,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ui_sounds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_read_ui_sounds" ON ui_sounds;
CREATE POLICY "auth_read_ui_sounds" ON ui_sounds FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "anon_read_ui_sounds" ON ui_sounds;
CREATE POLICY "anon_read_ui_sounds" ON ui_sounds FOR SELECT
  TO anon USING (true);

DROP POLICY IF EXISTS "admin_write_ui_sounds" ON ui_sounds;
CREATE POLICY "admin_write_ui_sounds" ON ui_sounds FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid())
  );

INSERT INTO ui_sounds (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. STORAGE BUCKETS
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('ui-media', 'ui-media', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('ui-sounds', 'ui-sounds', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for ui-media bucket
DROP POLICY IF EXISTS "admin_upload_ui_media" ON storage.objects;
CREATE POLICY "admin_upload_ui_media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ui-media' AND EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

DROP POLICY IF EXISTS "public_read_ui_media" ON storage.objects;
CREATE POLICY "public_read_ui_media" ON storage.objects
  FOR SELECT USING (bucket_id = 'ui-media');

DROP POLICY IF EXISTS "admin_delete_ui_media" ON storage.objects;
CREATE POLICY "admin_delete_ui_media" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'ui-media' AND EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

-- Policies for ui-sounds bucket
DROP POLICY IF EXISTS "admin_upload_ui_sounds" ON storage.objects;
CREATE POLICY "admin_upload_ui_sounds" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ui-sounds' AND EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));

DROP POLICY IF EXISTS "public_read_ui_sounds" ON storage.objects;
CREATE POLICY "public_read_ui_sounds" ON storage.objects
  FOR SELECT USING (bucket_id = 'ui-sounds');

DROP POLICY IF EXISTS "admin_delete_ui_sounds" ON storage.objects;
CREATE POLICY "admin_delete_ui_sounds" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'ui-sounds' AND EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()));
