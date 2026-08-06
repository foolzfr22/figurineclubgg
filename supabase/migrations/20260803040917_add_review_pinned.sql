/*
# Add is_pinned column to reviews

## Changes
- Add `is_pinned` boolean column to reviews table (default false)
- Allows admins to pin specific reviews to the top of product pages
*/

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;
