-- Admin-managed board categories. Additive; auto-applied on deploy.

CREATE TABLE IF NOT EXISTS categories (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

ALTER TABLE topics ADD COLUMN category_id INTEGER NOT NULL DEFAULT 0;

INSERT INTO categories (name, slug, sort_order, created_at) VALUES
  ('General',       'general',       0, (strftime('%s','now') * 1000)),
  ('Introductions', 'introductions', 1, (strftime('%s','now') * 1000)),
  ('Ask the room',  'ask',           2, (strftime('%s','now') * 1000)),
  ('Wins',          'wins',          3, (strftime('%s','now') * 1000)),
  ('Deals',         'deals',         4, (strftime('%s','now') * 1000));

-- Put any existing topics in General.
UPDATE topics SET category_id = (SELECT id FROM categories WHERE slug = 'general') WHERE category_id = 0;
