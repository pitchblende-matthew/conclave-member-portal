-- Moderation: member content reports + a generic rate-limit event log.
-- Additive; auto-applied on deploy.

CREATE TABLE IF NOT EXISTS reports (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  reporter_id INTEGER NOT NULL,
  target_type TEXT NOT NULL,            -- 'topic' | 'post' | 'member'
  target_id   INTEGER NOT NULL,
  reason      TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'open', -- 'open' | 'resolved' | 'dismissed'
  created_at  INTEGER NOT NULL,
  resolved_by INTEGER,
  resolved_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports (status, created_at);

CREATE TABLE IF NOT EXISTS rate_events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  bucket     TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rate_bucket ON rate_events (bucket, created_at);
