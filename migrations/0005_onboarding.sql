-- Two-step onboarding: request access (pending) -> approval -> onboarding.
-- Additive; auto-applied on deploy.

ALTER TABLE users ADD COLUMN status      TEXT NOT NULL DEFAULT 'pending'; -- pending | approved | declined
ALTER TABLE users ADD COLUMN onboarded   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN approved_at INTEGER;
ALTER TABLE users ADD COLUMN approved_by INTEGER;

-- Everyone who already has an account is an established member: approve and
-- mark them onboarded so the new gates don't lock them out.
UPDATE users SET status = 'approved', onboarded = 1;
