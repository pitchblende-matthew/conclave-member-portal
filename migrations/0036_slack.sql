-- Slack integration. Phase 1 surfaces a shared invite link (stored in
-- app_settings, admin-editable) to approved members. These columns are for
-- Phase 2 identity linking via "Sign in with Slack". Additive; auto-applied.
ALTER TABLE users ADD COLUMN slack_user_id TEXT;
ALTER TABLE users ADD COLUMN slack_team_id TEXT;
ALTER TABLE users ADD COLUMN slack_linked_at INTEGER;
