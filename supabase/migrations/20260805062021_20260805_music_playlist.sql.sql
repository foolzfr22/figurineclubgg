/*
# Create Background Music Playlist Table

1. New Tables
   - `music_tracks`: Stores individual audio tracks for the website background music playlist.
     - `id` (uuid, primary key)
     - `title` (text, not null): Display name of the track
     - `file_url` (text, not null): Public URL to the audio file in storage bucket `website-music`
     - `file_path` (text, nullable): Storage path for deletion
     - `sort_order` (integer, default 0): Ordering of tracks in the playlist
     - `is_default` (boolean, default false): Whether this track is the default first song
     - `duration` (text, nullable): Optional duration label
     - `created_at` (timestamptz, default now())
2. Security
   - Enable RLS on `music_tracks`.
   - Public (anon + authenticated) can SELECT tracks — visitors need to load the playlist.
   - Only authenticated users can INSERT/UPDATE/DELETE — admin gates this in the app.
3. Important Notes
   - Audio files are stored in the existing `website-music` storage bucket.
   - The playlist updates instantly on the website via realtime or refetch.
   - Only one track should have `is_default = true` at a time; the app enforces this.
*/

CREATE TABLE IF NOT EXISTS music_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  file_url text NOT NULL,
  file_path text,
  sort_order integer NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  duration text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE music_tracks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read music tracks" ON music_tracks;
CREATE POLICY "Public can read music tracks"
ON music_tracks FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated can insert music tracks" ON music_tracks;
CREATE POLICY "Authenticated can insert music tracks"
ON music_tracks FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update music tracks" ON music_tracks;
CREATE POLICY "Authenticated can update music tracks"
ON music_tracks FOR UPDATE
TO authenticated
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can delete music tracks" ON music_tracks;
CREATE POLICY "Authenticated can delete music tracks"
ON music_tracks FOR DELETE
TO authenticated
USING (true);

CREATE INDEX IF NOT EXISTS idx_music_tracks_sort_order ON music_tracks(sort_order);
