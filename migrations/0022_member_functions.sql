-- Member organization by Function (Marketing, Finance, …) and Seniority
-- (Owner/Founder, Executive, …). Two single-select axes on users, mirroring the
-- industries taxonomy for companies. Seeds starter lists and best-effort
-- back-fills from the existing free-text `role` (title) via keyword matching.
-- The `role` title column is kept as-is for display.
-- Additive migration; auto-applied by Webflow Cloud on deploy.

CREATE TABLE IF NOT EXISTS functions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS seniorities (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

ALTER TABLE users ADD COLUMN function_id  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN seniority_id INTEGER NOT NULL DEFAULT 0;

INSERT OR IGNORE INTO functions (name, slug, sort_order, created_at) VALUES
  ('Marketing',          'marketing',          1,  (strftime('%s','now') * 1000)),
  ('Sales',              'sales',              2,  (strftime('%s','now') * 1000)),
  ('Finance',            'finance',            3,  (strftime('%s','now') * 1000)),
  ('Operations',         'operations',         4,  (strftime('%s','now') * 1000)),
  ('Product',            'product',            5,  (strftime('%s','now') * 1000)),
  ('Engineering',        'engineering',        6,  (strftime('%s','now') * 1000)),
  ('Design',             'design',             7,  (strftime('%s','now') * 1000)),
  ('People & HR',        'people-hr',          8,  (strftime('%s','now') * 1000)),
  ('Legal',              'legal',              9,  (strftime('%s','now') * 1000)),
  ('Strategy',           'strategy',           10, (strftime('%s','now') * 1000)),
  ('Customer Success',   'customer-success',   11, (strftime('%s','now') * 1000)),
  ('Data & Analytics',   'data-analytics',     12, (strftime('%s','now') * 1000)),
  ('General Management', 'general-management', 13, (strftime('%s','now') * 1000)),
  ('Other',              'other',              99, (strftime('%s','now') * 1000));

INSERT OR IGNORE INTO seniorities (name, slug, sort_order, created_at) VALUES
  ('Owner / Founder',        'owner-founder',          1,  (strftime('%s','now') * 1000)),
  ('C-Suite / Executive',    'executive',              2,  (strftime('%s','now') * 1000)),
  ('Partner',                'partner',                3,  (strftime('%s','now') * 1000)),
  ('VP',                     'vp',                     4,  (strftime('%s','now') * 1000)),
  ('Director',               'director',               5,  (strftime('%s','now') * 1000)),
  ('Manager',                'manager',                6,  (strftime('%s','now') * 1000)),
  ('Individual Contributor', 'individual-contributor', 7,  (strftime('%s','now') * 1000)),
  ('Advisor',                'advisor',                8,  (strftime('%s','now') * 1000)),
  ('Other',                  'other',                  99, (strftime('%s','now') * 1000));

-- Best-effort function back-fill from the free-text role/title. Specific functions
-- first; general management is the catch-all for owner/CEO-type titles.
UPDATE users SET function_id=(SELECT id FROM functions WHERE slug='finance')
 WHERE function_id=0 AND (lower(role) LIKE '%financ%' OR lower(role) LIKE '%cfo%' OR lower(role) LIKE '%controller%' OR lower(role) LIKE '%accounting%' OR lower(role) LIKE '%fp&a%');
UPDATE users SET function_id=(SELECT id FROM functions WHERE slug='marketing')
 WHERE function_id=0 AND (lower(role) LIKE '%market%' OR lower(role) LIKE '%brand%' OR lower(role) LIKE '%growth%' OR lower(role) LIKE '%demand gen%' OR lower(role) LIKE '%cmo%');
UPDATE users SET function_id=(SELECT id FROM functions WHERE slug='sales')
 WHERE function_id=0 AND (lower(role) LIKE '%sales%' OR lower(role) LIKE '%revenue%' OR lower(role) LIKE '%cro%' OR lower(role) LIKE '%business development%' OR lower(role) LIKE '%account exec%');
UPDATE users SET function_id=(SELECT id FROM functions WHERE slug='engineering')
 WHERE function_id=0 AND (lower(role) LIKE '%engineer%' OR lower(role) LIKE '%developer%' OR lower(role) LIKE '%cto%' OR lower(role) LIKE '%software%' OR lower(role) LIKE '%technical%' OR lower(role) LIKE '%technology%');
UPDATE users SET function_id=(SELECT id FROM functions WHERE slug='product')
 WHERE function_id=0 AND (lower(role) LIKE '%product%' OR lower(role) LIKE '%cpo%');
UPDATE users SET function_id=(SELECT id FROM functions WHERE slug='design')
 WHERE function_id=0 AND (lower(role) LIKE '%design%' OR lower(role) LIKE '%ux%' OR lower(role) LIKE '%creative%');
UPDATE users SET function_id=(SELECT id FROM functions WHERE slug='people-hr')
 WHERE function_id=0 AND (lower(role) LIKE '%people%' OR lower(role) LIKE '%human resource%' OR lower(role) LIKE '%talent%' OR lower(role) LIKE '%recruit%');
UPDATE users SET function_id=(SELECT id FROM functions WHERE slug='legal')
 WHERE function_id=0 AND (lower(role) LIKE '%legal%' OR lower(role) LIKE '%counsel%' OR lower(role) LIKE '%attorney%' OR lower(role) LIKE '%lawyer%');
UPDATE users SET function_id=(SELECT id FROM functions WHERE slug='operations')
 WHERE function_id=0 AND (lower(role) LIKE '%operations%' OR lower(role) LIKE '%coo%' OR lower(role) LIKE '% ops%');
UPDATE users SET function_id=(SELECT id FROM functions WHERE slug='strategy')
 WHERE function_id=0 AND (lower(role) LIKE '%strateg%');
UPDATE users SET function_id=(SELECT id FROM functions WHERE slug='customer-success')
 WHERE function_id=0 AND (lower(role) LIKE '%customer success%' OR lower(role) LIKE '%customer experience%');
UPDATE users SET function_id=(SELECT id FROM functions WHERE slug='data-analytics')
 WHERE function_id=0 AND (lower(role) LIKE '%data%' OR lower(role) LIKE '%analytics%' OR lower(role) LIKE '%analyst%');
UPDATE users SET function_id=(SELECT id FROM functions WHERE slug='general-management')
 WHERE function_id=0 AND TRIM(role) <> '' AND (lower(role) LIKE '%founder%' OR lower(role) LIKE '%owner%' OR lower(role) LIKE '%ceo%' OR lower(role) LIKE '%president%' OR lower(role) LIKE '%general manager%' OR lower(role) LIKE '%managing director%' OR lower(role) LIKE '%principal%');

-- Best-effort seniority back-fill. Most senior / most specific first.
UPDATE users SET seniority_id=(SELECT id FROM seniorities WHERE slug='owner-founder')
 WHERE seniority_id=0 AND (lower(role) LIKE '%founder%' OR lower(role) LIKE '%owner%' OR lower(role) LIKE '%proprietor%');
UPDATE users SET seniority_id=(SELECT id FROM seniorities WHERE slug='vp')
 WHERE seniority_id=0 AND (lower(role) LIKE '%vp%' OR lower(role) LIKE '%vice president%');
UPDATE users SET seniority_id=(SELECT id FROM seniorities WHERE slug='partner')
 WHERE seniority_id=0 AND (lower(role) LIKE '%partner%' OR lower(role) LIKE '%principal%');
UPDATE users SET seniority_id=(SELECT id FROM seniorities WHERE slug='executive')
 WHERE seniority_id=0 AND (lower(role) LIKE '%chief%' OR lower(role) LIKE '%president%' OR lower(role) LIKE '%ceo%' OR lower(role) LIKE '%cfo%' OR lower(role) LIKE '%cto%' OR lower(role) LIKE '%coo%' OR lower(role) LIKE '%cmo%' OR lower(role) LIKE '%cro%' OR lower(role) LIKE '%cpo%' OR lower(role) LIKE '%executive%');
UPDATE users SET seniority_id=(SELECT id FROM seniorities WHERE slug='director')
 WHERE seniority_id=0 AND (lower(role) LIKE '%director%' OR lower(role) LIKE '%head of%');
UPDATE users SET seniority_id=(SELECT id FROM seniorities WHERE slug='manager')
 WHERE seniority_id=0 AND (lower(role) LIKE '%manager%' OR lower(role) LIKE '%lead%' OR lower(role) LIKE '%supervisor%');
UPDATE users SET seniority_id=(SELECT id FROM seniorities WHERE slug='advisor')
 WHERE seniority_id=0 AND (lower(role) LIKE '%advisor%' OR lower(role) LIKE '%advisory%' OR lower(role) LIKE '%board member%');
