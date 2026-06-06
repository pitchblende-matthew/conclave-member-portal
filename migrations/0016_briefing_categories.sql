-- Admin-managed categories for the Briefings section (separate from the board's).
-- Additive; auto-applied on deploy.

CREATE TABLE IF NOT EXISTS briefing_categories (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

INSERT INTO briefing_categories (name, slug, sort_order, created_at) VALUES
  ('Marketing',     'marketing',   0, (strftime('%s','now') * 1000)),
  ('Finance & Tax', 'finance-tax', 1, (strftime('%s','now') * 1000)),
  ('Operations',    'operations',  2, (strftime('%s','now') * 1000)),
  ('Sales',         'sales',       3, (strftime('%s','now') * 1000)),
  ('Legal',         'legal',       4, (strftime('%s','now') * 1000)),
  ('Technology',    'technology',  5, (strftime('%s','now') * 1000)),
  ('Leadership',    'leadership',  6, (strftime('%s','now') * 1000)),
  ('Funding',       'funding',     7, (strftime('%s','now') * 1000));

ALTER TABLE briefings ADD COLUMN category_id INTEGER NOT NULL DEFAULT 0;

-- File the seeded briefings under sensible categories.
UPDATE briefings SET category_id = (SELECT id FROM briefing_categories WHERE slug = 'operations')  WHERE title = 'SBA Business Guide';
UPDATE briefings SET category_id = (SELECT id FROM briefing_categories WHERE slug = 'leadership')  WHERE title = 'SCORE: Free Mentoring & Templates';
UPDATE briefings SET category_id = (SELECT id FROM briefing_categories WHERE slug = 'finance-tax') WHERE title = 'IRS Small Business Tax Center';
UPDATE briefings SET category_id = (SELECT id FROM briefing_categories WHERE slug = 'funding')     WHERE title = 'Y Combinator Startup Library';
UPDATE briefings SET category_id = (SELECT id FROM briefing_categories WHERE slug = 'leadership')  WHERE title = 'Paul Graham''s Essays';
UPDATE briefings SET category_id = (SELECT id FROM briefing_categories WHERE slug = 'leadership')  WHERE title = 'HBR on Entrepreneurship';
UPDATE briefings SET category_id = (SELECT id FROM briefing_categories WHERE slug = 'marketing')   WHERE title = 'Shopify Business Blog';
UPDATE briefings SET category_id = (SELECT id FROM briefing_categories WHERE slug = 'marketing')   WHERE title = 'HubSpot Marketing Blog';
UPDATE briefings SET category_id = (SELECT id FROM briefing_categories WHERE slug = 'leadership')  WHERE title = 'First Round Review';
UPDATE briefings SET category_id = (SELECT id FROM briefing_categories WHERE slug = 'finance-tax') WHERE title = 'Stripe Guides';
UPDATE briefings SET category_id = (SELECT id FROM briefing_categories WHERE slug = 'marketing')   WHERE title = 'Grow with Google: Small Business';
UPDATE briefings SET category_id = (SELECT id FROM briefing_categories WHERE slug = 'marketing')   WHERE title = 'Mailchimp Resources';
