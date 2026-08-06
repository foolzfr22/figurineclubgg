/*
# Add Background Music Settings

1. Modified Tables
   - `settings`: Added 3 new columns for background music configuration:
     - `music_enabled` (boolean, default false): Whether background music is active
     - `music_url` (text, nullable): URL to the uploaded music file in storage
     - `music_title` (text, nullable): Display name for the current track
2. Security
   - No new tables. Existing settings policies cover the new columns.
   - Anon/authenticated can SELECT settings (already policy exists).
   - Only admins can UPDATE settings (already policy exists).
3. Important Notes
   - Music files are stored in Supabase Storage bucket `website-music`.
   - The `music_url` column stores the public URL of the uploaded file.
   - Music is never autoplayed — the frontend respects browser autoplay policies
     by only playing after user interaction.
*/

ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS music_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS music_url text,
  ADD COLUMN IF NOT EXISTS music_title text;
