-- Richer member profiles: avatar + contact/social fields.
-- Migrations are additive; each column has a safe default so existing rows are valid.

ALTER TABLE users ADD COLUMN avatar_key TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN pronouns   TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN phone      TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN website    TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN linkedin   TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN twitter    TEXT NOT NULL DEFAULT '';
