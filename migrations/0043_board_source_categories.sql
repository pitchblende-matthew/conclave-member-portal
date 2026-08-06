-- Dedicated board categories for the auto-created discussion threads, so event
-- and briefing conversations are browsable as their own sections. Additive;
-- runs once on deploy. INSERT OR IGNORE keeps the categories idempotent.
INSERT OR IGNORE INTO categories (name, slug, sort_order, created_at) VALUES
  ('Events',    'events',    5, strftime('%s','now') * 1000),
  ('Briefings', 'briefings', 6, strftime('%s','now') * 1000);

-- File existing source-linked threads (created by migration 0042 with no
-- category) under the new categories. Only touch threads still uncategorized or
-- in General, so any manual re-filing by an admin is preserved.
UPDATE topics
SET category_id = (SELECT id FROM categories WHERE slug = 'events')
WHERE source_type = 'event'
  AND category_id IN (0, (SELECT id FROM categories WHERE slug = 'general'));

UPDATE topics
SET category_id = (SELECT id FROM categories WHERE slug = 'briefings')
WHERE source_type = 'briefing'
  AND category_id IN (0, (SELECT id FROM categories WHERE slug = 'general'));
