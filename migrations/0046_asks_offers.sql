-- Asks & Offers: a give/get board. Members post an "ask" (I need…) or an
-- "offer" (I can help with…); others respond in a thread. The poster or an
-- admin can mark it resolved or delete it. Additive; auto-applied on deploy.

CREATE TABLE IF NOT EXISTS requests (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  kind       TEXT NOT NULL,                -- 'ask' | 'offer'
  user_id    INTEGER NOT NULL,             -- poster
  title      TEXT NOT NULL,
  body       TEXT NOT NULL DEFAULT '',
  category   TEXT NOT NULL DEFAULT 'other', -- intro | advice | hiring | vendor | capital | partnership | other
  status     TEXT NOT NULL DEFAULT 'open',  -- 'open' | 'resolved'
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_requests_kind ON requests (kind, status, created_at);
CREATE INDEX IF NOT EXISTS idx_requests_user ON requests (user_id);

CREATE TABLE IF NOT EXISTS request_responses (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL,
  user_id    INTEGER NOT NULL,
  body       TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_request_responses ON request_responses (request_id, created_at);
