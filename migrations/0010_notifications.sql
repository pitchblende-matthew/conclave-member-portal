-- In-app notifications: connection requests/accepts, replies to your topics, etc.
-- Additive migration; auto-applied by Webflow Cloud on deploy.

CREATE TABLE IF NOT EXISTS notifications (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL,   -- recipient
  type       TEXT NOT NULL,      -- 'connection_request' | 'connection_accepted' | 'topic_reply'
  actor_id   INTEGER,            -- who triggered it
  topic_id   INTEGER,            -- link target for reply notifications
  post_id    INTEGER,
  read_at    INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, read_at, created_at);
