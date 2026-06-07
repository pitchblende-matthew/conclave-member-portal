-- Industries: an admin-managed taxonomy for organizing companies, mirroring the
-- board's categories. Adds companies.industry_id, seeds a starter list, and
-- back-fills it from the existing free-text `industry` values (exact + synonym
-- matches). The legacy `industry` text column is kept for display/search.
-- Additive migration; auto-applied by Webflow Cloud on deploy.

CREATE TABLE IF NOT EXISTS industries (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

ALTER TABLE companies ADD COLUMN industry_id INTEGER NOT NULL DEFAULT 0;

INSERT OR IGNORE INTO industries (name, slug, sort_order, created_at) VALUES
  ('Marketing & Advertising', 'marketing-advertising',  1,  (strftime('%s','now') * 1000)),
  ('Software & SaaS',         'software-saas',          2,  (strftime('%s','now') * 1000)),
  ('E-commerce & Retail',     'ecommerce-retail',       3,  (strftime('%s','now') * 1000)),
  ('Financial Services',      'financial-services',     4,  (strftime('%s','now') * 1000)),
  ('Healthcare',              'healthcare',             5,  (strftime('%s','now') * 1000)),
  ('Legal',                   'legal',                  6,  (strftime('%s','now') * 1000)),
  ('Real Estate',             'real-estate',            7,  (strftime('%s','now') * 1000)),
  ('Professional Services',   'professional-services',  8,  (strftime('%s','now') * 1000)),
  ('Media & Entertainment',   'media-entertainment',    9,  (strftime('%s','now') * 1000)),
  ('Manufacturing & Industrial','manufacturing',        10, (strftime('%s','now') * 1000)),
  ('Education',               'education',              11, (strftime('%s','now') * 1000)),
  ('Hospitality & Travel',    'hospitality-travel',     12, (strftime('%s','now') * 1000)),
  ('Construction',            'construction',           13, (strftime('%s','now') * 1000)),
  ('Nonprofit',               'nonprofit',              14, (strftime('%s','now') * 1000)),
  ('Other',                   'other',                  99, (strftime('%s','now') * 1000));

-- Exact (case-insensitive) name match from the legacy free-text column.
UPDATE companies
   SET industry_id = (SELECT id FROM industries WHERE lower(name) = lower(trim(companies.industry)))
 WHERE industry_id = 0 AND TRIM(industry) <> ''
   AND EXISTS (SELECT 1 FROM industries WHERE lower(name) = lower(trim(companies.industry)));

-- Common synonyms / variants -> canonical industry.
UPDATE companies SET industry_id = (SELECT id FROM industries WHERE slug='software-saas')
 WHERE industry_id = 0 AND lower(trim(industry)) IN ('saas','software','tech','technology','it','information technology','software & saas');
UPDATE companies SET industry_id = (SELECT id FROM industries WHERE slug='marketing-advertising')
 WHERE industry_id = 0 AND lower(trim(industry)) IN ('marketing','advertising','agency','ad agency','digital marketing','b2b agency','marketing & advertising');
UPDATE companies SET industry_id = (SELECT id FROM industries WHERE slug='healthcare')
 WHERE industry_id = 0 AND lower(trim(industry)) IN ('health','medical','health care','healthcare services','specialty medical');
UPDATE companies SET industry_id = (SELECT id FROM industries WHERE slug='legal')
 WHERE industry_id = 0 AND lower(trim(industry)) IN ('law','law firm','boutique law firm');
UPDATE companies SET industry_id = (SELECT id FROM industries WHERE slug='financial-services')
 WHERE industry_id = 0 AND lower(trim(industry)) IN ('finance','financial','fintech','banking','accounting','financial services');
UPDATE companies SET industry_id = (SELECT id FROM industries WHERE slug='professional-services')
 WHERE industry_id = 0 AND lower(trim(industry)) IN ('consulting','consultancy','professional services','boutique consultancy');
UPDATE companies SET industry_id = (SELECT id FROM industries WHERE slug='real-estate')
 WHERE industry_id = 0 AND lower(trim(industry)) IN ('realty','property','real estate');
UPDATE companies SET industry_id = (SELECT id FROM industries WHERE slug='ecommerce-retail')
 WHERE industry_id = 0 AND lower(trim(industry)) IN ('retail','e-commerce','ecommerce','dtc','dtc brand','consumer goods','e-commerce & retail');
UPDATE companies SET industry_id = (SELECT id FROM industries WHERE slug='media-entertainment')
 WHERE industry_id = 0 AND lower(trim(industry)) IN ('media','entertainment','media & entertainment');
UPDATE companies SET industry_id = (SELECT id FROM industries WHERE slug='manufacturing')
 WHERE industry_id = 0 AND lower(trim(industry)) IN ('manufacturing','industrial','manufacturing & industrial');
UPDATE companies SET industry_id = (SELECT id FROM industries WHERE slug='education')
 WHERE industry_id = 0 AND lower(trim(industry)) IN ('education','edtech');
UPDATE companies SET industry_id = (SELECT id FROM industries WHERE slug='hospitality-travel')
 WHERE industry_id = 0 AND lower(trim(industry)) IN ('hospitality','travel','restaurant','hospitality & travel');
UPDATE companies SET industry_id = (SELECT id FROM industries WHERE slug='construction')
 WHERE industry_id = 0 AND lower(trim(industry)) IN ('construction','architecture studio','architecture');
UPDATE companies SET industry_id = (SELECT id FROM industries WHERE slug='nonprofit')
 WHERE industry_id = 0 AND lower(trim(industry)) IN ('nonprofit','non-profit','ngo','not-for-profit');
