-- Event emails: announce new events to the network, and remind attendees at
-- 1 week / 3 days / 1 day before the event. Sent by a scheduled runner (Webflow
-- Cloud has no cron); this log makes every send idempotent.
CREATE TABLE IF NOT EXISTS event_email_log (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  kind     TEXT NOT NULL,          -- 'added' | 'week' | '3day' | '1day'
  sent_at  INTEGER NOT NULL,
  UNIQUE(event_id, kind)
);

-- Per-member opt-out for event emails, separate from the weekly digest so a
-- member can keep one without the other.
ALTER TABLE users ADD COLUMN event_opt_out INTEGER NOT NULL DEFAULT 0;

-- Suppress retroactive "new event" announcements for events that already exist
-- at deploy time by marking them as already announced. Reminder kinds are
-- deliberately NOT seeded, so upcoming events still get their 1-week / 3-day /
-- 1-day reminders as those windows arrive.
INSERT OR IGNORE INTO event_email_log (event_id, kind, sent_at)
SELECT id, 'added', strftime('%s','now') * 1000 FROM events WHERE status = 'approved';
