-- Unify member intake: the marketing site's form now creates a pending
-- application (a users row) instead of a separate invite_requests row, so admins
-- have a single review queue. Two small fields support that:
--   apply_note     — the message the applicant left on the form
--   needs_password — set for accounts created without a password (the applicant
--                    sets one via a link sent when their application is approved)
-- Additive; auto-applied on deploy.

ALTER TABLE users ADD COLUMN apply_note     TEXT    NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN needs_password INTEGER NOT NULL DEFAULT 0;
