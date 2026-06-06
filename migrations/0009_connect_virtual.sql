-- Member connections (mutual), virtual events, and a company LinkedIn field.
-- Additive migration; auto-applied by Webflow Cloud on deploy.

CREATE TABLE IF NOT EXISTS connections (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  requester_id INTEGER NOT NULL,
  addressee_id INTEGER NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'accepted'
  created_at   INTEGER NOT NULL,
  responded_at INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_connections_pair ON connections (requester_id, addressee_id);
CREATE INDEX IF NOT EXISTS idx_connections_addressee ON connections (addressee_id, status);

-- Virtual events: a flag plus an online join link. Virtual events are
-- network-wide (they carry no media market).
ALTER TABLE events ADD COLUMN is_virtual  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE events ADD COLUMN meeting_url TEXT NOT NULL DEFAULT '';

-- LinkedIn page for company profiles.
ALTER TABLE companies ADD COLUMN linkedin TEXT NOT NULL DEFAULT '';
