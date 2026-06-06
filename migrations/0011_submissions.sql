-- Member-submitted events and briefings, gated by admin approval.
-- Additive migration; auto-applied by Webflow Cloud on deploy.
-- Existing rows default to 'approved' so current content is unaffected.

ALTER TABLE events ADD COLUMN status       TEXT NOT NULL DEFAULT 'approved'; -- 'pending'|'approved'|'declined'
ALTER TABLE events ADD COLUMN submitted_by INTEGER;

ALTER TABLE briefings ADD COLUMN status       TEXT NOT NULL DEFAULT 'approved';
ALTER TABLE briefings ADD COLUMN submitted_by INTEGER;
