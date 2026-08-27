-- Warm intros ("The Handshake"): a monthly 1:1 pairing of members, delivered by
-- email, on the same external-scheduler pattern as the digest. intro_pairs
-- records who was matched each round (stored canonically, user_a < user_b) so
-- the matcher can avoid recent repeats and the runner stays idempotent per
-- round. Additive; auto-applied on deploy.
CREATE TABLE IF NOT EXISTS intro_pairs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  round      TEXT NOT NULL,          -- 'YYYY-MM'
  user_a     INTEGER NOT NULL,       -- always the lower user id
  user_b     INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_intro_pairs_round ON intro_pairs (round);
CREATE INDEX IF NOT EXISTS idx_intro_pairs_users ON intro_pairs (user_a, user_b);

-- Per-member opt-out from the monthly intros.
ALTER TABLE users ADD COLUMN intro_opt_out INTEGER NOT NULL DEFAULT 0;
