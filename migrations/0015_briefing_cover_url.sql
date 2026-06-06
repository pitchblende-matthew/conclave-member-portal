-- Cover image URL scraped from a link briefing's OpenGraph/Twitter tags.
-- Additive migration; auto-applied by Webflow Cloud on deploy.

ALTER TABLE briefings ADD COLUMN cover_url TEXT NOT NULL DEFAULT '';
