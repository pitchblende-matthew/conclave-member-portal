-- Admin curation for warm intros: each monthly round now has a status so the
-- pairings can be reviewed and adjusted before they send. The runner drafts the
-- pairings and notifies admins; an admin approves (or edits) and sends, and if
-- nobody acts within a few days the runner auto-sends the draft so intros never
-- silently stop. Additive; auto-applied on deploy.
CREATE TABLE IF NOT EXISTS intro_rounds (
  round      TEXT PRIMARY KEY,             -- 'YYYY-MM'
  status     TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'sent'
  created_at INTEGER NOT NULL,
  sent_at    INTEGER
);
