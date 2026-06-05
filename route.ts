-- Conclave member portal — initial schema
-- Webflow Cloud auto-applies migrations in this directory on deploy.

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL DEFAULT '',
  company       TEXT NOT NULL DEFAULT '',
  role          TEXT NOT NULL DEFAULT '',
  location      TEXT NOT NULL DEFAULT '',
  bio           TEXT NOT NULL DEFAULT '',
  is_admin      INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS invites (
  token      TEXT PRIMARY KEY,
  email      TEXT,
  created_by INTEGER,
  used_by    INTEGER,
  created_at INTEGER NOT NULL,
  used_at    INTEGER
);

CREATE TABLE IF NOT EXISTS events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  location    TEXT NOT NULL DEFAULT '',
  starts_at   INTEGER NOT NULL,
  capacity    INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS rsvps (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id   INTEGER NOT NULL,
  user_id    INTEGER NOT NULL,
  status     TEXT NOT NULL DEFAULT 'going',
  created_at INTEGER NOT NULL,
  UNIQUE(event_id, user_id)
);

-- A few seed events so the Events page isn't empty on first run.
-- starts_at is a Unix timestamp in milliseconds. Adjust freely.
INSERT INTO events (title, description, location, starts_at, capacity, created_at) VALUES
  ('Westchester Founders'' Dinner', 'An intimate dinner for owners and operators across the metro. Limited seats.', 'Tarrytown, NY', 1781308800000, 14, 0),
  ('What''s Actually Working Right Now', 'A candid roundtable on what is moving the needle this quarter.', 'Virtual', 1782518400000, 40, 0),
  ('The Owner''s Problem', 'Peer working session on the hardest problem on your desk.', 'Greenwich, CT', 1783728000000, 12, 0);
