-- Warm intros, part 2: follow-ups + "we met" tracking.
--
-- A week after a round is sent, the runner nudges each paired member ("did you
-- two connect?"); followed_up_at on the round makes that idempotent. Either
-- member can mark the pair as met — from the email's one-click link or the
-- dashboard card — recorded on the pair with who marked it and when. Powers the
-- member-facing intro card and the admin round-history view. Additive; auto-
-- applied on deploy.
ALTER TABLE intro_rounds ADD COLUMN followed_up_at INTEGER;
ALTER TABLE intro_pairs  ADD COLUMN met_at INTEGER;
ALTER TABLE intro_pairs  ADD COLUMN met_by INTEGER;
