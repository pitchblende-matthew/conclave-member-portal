-- Capture the reporter's browser/OS (user-agent) on feedback, to speed up
-- reproducing bugs. Additive; auto-applied on deploy.

ALTER TABLE feedback ADD COLUMN user_agent TEXT NOT NULL DEFAULT '';
