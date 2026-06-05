-- Company profiles, and a link from each member to their company.
-- Additive migration; auto-applied by Webflow Cloud on deploy.

CREATE TABLE IF NOT EXISTS companies (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  logo_key    TEXT NOT NULL DEFAULT '',
  website     TEXT NOT NULL DEFAULT '',
  industry    TEXT NOT NULL DEFAULT '',
  size        TEXT NOT NULL DEFAULT '',
  location    TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  created_by  INTEGER,
  created_at  INTEGER NOT NULL
);

-- 0 = not linked to any company.
ALTER TABLE users ADD COLUMN company_id INTEGER NOT NULL DEFAULT 0;
