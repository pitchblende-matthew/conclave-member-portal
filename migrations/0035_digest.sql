-- Weekly digest: per-member opt-out, and a tiny key/value table to remember when
-- the digest last ran (so manual + scheduled triggers don't double-send).
-- Additive; auto-applied on deploy.

ALTER TABLE users ADD COLUMN digest_opt_out INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS app_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
