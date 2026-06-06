-- Password reset tokens for the forgot/reset-password flow.
-- Additive migration; auto-applied by Webflow Cloud on deploy.

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token      TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at    INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_prt_user ON password_reset_tokens (user_id);
