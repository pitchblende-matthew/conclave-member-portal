-- Admin reply on a feedback item, to close the loop with the tester (who sees it
-- on their own reports page). Additive; auto-applied on deploy.

ALTER TABLE feedback ADD COLUMN admin_reply TEXT NOT NULL DEFAULT '';
ALTER TABLE feedback ADD COLUMN replied_at  INTEGER;
