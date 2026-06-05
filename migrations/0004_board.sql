-- Discussion board: topics with replies. Additive; auto-applied on deploy.

CREATE TABLE IF NOT EXISTS topics (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  title            TEXT NOT NULL,
  created_by       INTEGER NOT NULL,
  created_at       INTEGER NOT NULL,
  last_activity_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS posts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_id   INTEGER NOT NULL,
  user_id    INTEGER NOT NULL,
  body       TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_posts_topic ON posts(topic_id, created_at);
