-- Invitation requests captured from the marketing site's homepage form.
-- Additive; auto-applied on deploy.

CREATE TABLE IF NOT EXISTS invite_requests (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL DEFAULT '',
  email      TEXT NOT NULL,
  note       TEXT NOT NULL DEFAULT '',
  status     TEXT NOT NULL DEFAULT 'new', -- 'new' | 'handled' | 'dismissed'
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_invite_requests_status ON invite_requests (status, created_at);
