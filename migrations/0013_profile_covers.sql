-- Cover/banner images for member and company profiles.
-- Additive migration; auto-applied by Webflow Cloud on deploy.

ALTER TABLE users ADD COLUMN cover_key TEXT NOT NULL DEFAULT '';
ALTER TABLE companies ADD COLUMN cover_key TEXT NOT NULL DEFAULT '';
