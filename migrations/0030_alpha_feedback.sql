-- Alpha-tester role + an in-app feedback channel. Members granted the role get a
-- floating widget on every page to report a bug or suggest a feature, captured
-- against the page they were on. Additive; auto-applied on deploy.

ALTER TABLE users ADD COLUMN alpha_tester INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS feedback (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL,
  kind       TEXT NOT NULL,                 -- 'bug' | 'feature'
  page       TEXT NOT NULL DEFAULT '',      -- path the report was filed from
  body       TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'open',  -- 'open' | 'closed'
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback (status, created_at);
