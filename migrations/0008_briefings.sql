-- Briefings: short editorial posts published by admins. Each is either an
-- in-app "article" (rendered body) or a "link" out to an external URL.
-- Additive migration; auto-applied by Webflow Cloud on deploy.

CREATE TABLE IF NOT EXISTS briefings (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  kind         TEXT NOT NULL DEFAULT 'article', -- 'article' | 'link'
  title        TEXT NOT NULL,
  summary      TEXT NOT NULL DEFAULT '',
  body         TEXT NOT NULL DEFAULT '',         -- article copy
  url          TEXT NOT NULL DEFAULT '',         -- link destination
  cover_key    TEXT NOT NULL DEFAULT '',         -- R2 object key for the cover image
  author_id    INTEGER,
  published    INTEGER NOT NULL DEFAULT 0,        -- 0 = draft, 1 = published
  published_at INTEGER,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_briefings_published ON briefings (published, published_at);
