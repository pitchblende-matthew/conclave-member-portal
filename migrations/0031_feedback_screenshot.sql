-- Optional screenshot on alpha feedback (stored in R2 like avatars/covers).
-- Additive; auto-applied on deploy.

ALTER TABLE feedback ADD COLUMN screenshot_key TEXT NOT NULL DEFAULT '';
