/*
# Add cancellation support and Discord URL to settings

## Changes
1. Add `cancellation_requested` boolean + `cancellation_reason` text to orders
2. Add `discord_url` text column to settings table
3. Seed discord_url with a placeholder invite link
*/

-- Add cancellation columns to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_requested boolean DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_reason text;

-- Add discord_url to settings
ALTER TABLE settings ADD COLUMN IF NOT EXISTS discord_url text;

-- Seed discord_url
UPDATE settings SET discord_url = 'https://discord.gg/figureclub' WHERE discord_url IS NULL;
