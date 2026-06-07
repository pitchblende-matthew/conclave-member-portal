-- Lightweight engagement: per-member reactions ("appreciations") and bookmarks
-- ("saved"). One row per (user, kind, item); toggling inserts/deletes.
--   kind: 'react' | 'save'
--   content_type: 'briefing' | 'post' | 'topic' | 'event'
-- Additive; auto-applied on deploy.

CREATE TABLE IF NOT EXISTS user_content (
  user_id      INTEGER NOT NULL,
  kind         TEXT NOT NULL,
  content_type TEXT NOT NULL,
  content_id   INTEGER NOT NULL,
  created_at   INTEGER NOT NULL,
  PRIMARY KEY (user_id, kind, content_type, content_id)
);

CREATE INDEX IF NOT EXISTS idx_user_content_lookup ON user_content (kind, content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_user_content_user ON user_content (user_id, kind, content_type, created_at);
