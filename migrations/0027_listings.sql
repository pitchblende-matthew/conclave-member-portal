-- Member classifieds: a job board and a "business for sale" board share one
-- table, discriminated by `kind`. Listings are posted directly by members
-- (the network is vetted); the poster or an admin can close or delete them.
-- Additive; auto-applied on deploy.

CREATE TABLE IF NOT EXISTS listings (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  kind            TEXT NOT NULL,                 -- 'job' | 'business'
  user_id         INTEGER NOT NULL,              -- poster
  title           TEXT NOT NULL,
  company         TEXT NOT NULL DEFAULT '',      -- hiring company / business name
  description     TEXT NOT NULL DEFAULT '',
  -- location (empty when is_remote = 1)
  is_remote       INTEGER NOT NULL DEFAULT 0,
  city            TEXT NOT NULL DEFAULT '',
  state           TEXT NOT NULL DEFAULT '',
  zip             TEXT NOT NULL DEFAULT '',
  dma_slug        TEXT NOT NULL DEFAULT '',
  dma_name        TEXT NOT NULL DEFAULT '',
  -- job-specific
  employment_type TEXT NOT NULL DEFAULT '',      -- full_time | part_time | contract | …
  compensation    TEXT NOT NULL DEFAULT '',      -- free text, e.g. "$120k–150k"
  -- business-specific (0 = undisclosed)
  asking_price    INTEGER NOT NULL DEFAULT 0,
  annual_revenue  INTEGER NOT NULL DEFAULT 0,
  -- shared contact
  apply_url       TEXT NOT NULL DEFAULT '',
  contact_email   TEXT NOT NULL DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'open',  -- 'open' | 'closed' (filled/sold)
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_listings_kind ON listings (kind, status, created_at);
CREATE INDEX IF NOT EXISTS idx_listings_user ON listings (user_id, kind);
