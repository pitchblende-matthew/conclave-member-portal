-- Areas of expertise: an admin-curated taxonomy members self-assign (several
-- each). Same shape as the functions/seniorities taxonomy, but the user link is
-- a many-to-many join rather than a single column. Additive; auto-applied.

CREATE TABLE IF NOT EXISTS expertise (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_expertise (
  user_id      INTEGER NOT NULL,
  expertise_id INTEGER NOT NULL,
  PRIMARY KEY (user_id, expertise_id)
);
CREATE INDEX IF NOT EXISTS idx_user_expertise_taxon ON user_expertise (expertise_id, user_id);

INSERT OR IGNORE INTO expertise (name, slug, sort_order, created_at) VALUES
  ('Brand Strategy',          'brand-strategy',          1,  (strftime('%s','now') * 1000)),
  ('Performance Marketing',   'performance-marketing',   2,  (strftime('%s','now') * 1000)),
  ('SEO & SEM',               'seo-sem',                 3,  (strftime('%s','now') * 1000)),
  ('Paid Social',             'paid-social',             4,  (strftime('%s','now') * 1000)),
  ('Content Marketing',       'content-marketing',       5,  (strftime('%s','now') * 1000)),
  ('Creative & Design',       'creative-design',         6,  (strftime('%s','now') * 1000)),
  ('Data & Analytics',        'data-analytics',          7,  (strftime('%s','now') * 1000)),
  ('Marketing Automation',    'marketing-automation',    8,  (strftime('%s','now') * 1000)),
  ('Lifecycle & CRM',         'lifecycle-crm',           9,  (strftime('%s','now') * 1000)),
  ('Demand Generation',       'demand-generation',       10, (strftime('%s','now') * 1000)),
  ('PR & Communications',     'pr-communications',       11, (strftime('%s','now') * 1000)),
  ('Influencer & Partnerships','influencer-partnerships',12, (strftime('%s','now') * 1000)),
  ('Product Marketing',       'product-marketing',       13, (strftime('%s','now') * 1000)),
  ('Media Planning & Buying', 'media-planning-buying',   14, (strftime('%s','now') * 1000)),
  ('Marketing Operations',    'marketing-operations',    15, (strftime('%s','now') * 1000)),
  ('Ecommerce',               'ecommerce',               16, (strftime('%s','now') * 1000));
