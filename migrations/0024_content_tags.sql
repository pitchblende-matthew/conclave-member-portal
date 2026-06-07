-- Content tagging: link board topics, events, and briefings to industries and
-- functions (many-to-many), so content can be filtered by topic area. Tags are
-- set by whoever creates/edits the content. Additive; auto-applied on deploy.

CREATE TABLE IF NOT EXISTS content_tags (
  content_type TEXT NOT NULL,      -- 'topic' | 'event' | 'briefing'
  content_id   INTEGER NOT NULL,
  kind         TEXT NOT NULL,      -- 'industry' | 'function'
  taxon_id     INTEGER NOT NULL,
  PRIMARY KEY (content_type, content_id, kind, taxon_id)
);

CREATE INDEX IF NOT EXISTS idx_content_tags_lookup ON content_tags (kind, taxon_id, content_type);
CREATE INDEX IF NOT EXISTS idx_content_tags_item ON content_tags (content_type, content_id);
