-- Auto-discussion posts: when an event or briefing is added, a board topic is
-- opened for it so members can discuss. This migration sets up the plumbing and
-- backfills threads for the content already in the system.
--
-- (1) Link a topic back to the event/briefing that spawned it, so the runtime
--     hook + this backfill stay idempotent (one thread per source).
ALTER TABLE topics ADD COLUMN source_type TEXT NOT NULL DEFAULT ''; -- '' | 'event' | 'briefing'
ALTER TABLE topics ADD COLUMN source_id   INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_topics_source ON topics (source_type, source_id);

-- (2) A dedicated "Conclave" system account that authors the automated threads.
--     Non-login (no valid password hash) and status 'system' so it's excluded
--     from the members' directory. INSERT OR IGNORE keeps it idempotent.
INSERT OR IGNORE INTO users (email, password_hash, name, status, onboarded, is_admin, created_at)
VALUES ('conclave-system@jointheconclave.com', 'x-no-login', 'Conclave', 'system', 1, 0, strftime('%s','now') * 1000);

-- (3) Backfill: one thread per upcoming approved event and per published
--     briefing that doesn't already have one.
INSERT INTO topics (title, category_id, dma_slug, dma_name, created_by, created_at, last_activity_at, source_type, source_id)
SELECT 'New event · ' || e.title, 0, '', '',
       (SELECT id FROM users WHERE email = 'conclave-system@jointheconclave.com'),
       strftime('%s','now') * 1000, strftime('%s','now') * 1000, 'event', e.id
FROM events e
WHERE e.status = 'approved' AND e.starts_at > strftime('%s','now') * 1000
  AND NOT EXISTS (SELECT 1 FROM topics t WHERE t.source_type = 'event' AND t.source_id = e.id);

INSERT INTO posts (topic_id, user_id, body, created_at)
SELECT t.id, t.created_by,
       COALESCE(NULLIF(e.description, ''), 'A new gathering has been added to the calendar.') || char(10) || char(10) ||
       'This event is now on the Conclave calendar — RSVP on the Events page and let everyone know if you''re planning to come.',
       t.created_at
FROM topics t JOIN events e ON e.id = t.source_id
WHERE t.source_type = 'event'
  AND NOT EXISTS (SELECT 1 FROM posts p WHERE p.topic_id = t.id);

INSERT INTO topics (title, category_id, dma_slug, dma_name, created_by, created_at, last_activity_at, source_type, source_id)
SELECT 'New briefing · ' || b.title, 0, '', '',
       (SELECT id FROM users WHERE email = 'conclave-system@jointheconclave.com'),
       strftime('%s','now') * 1000, strftime('%s','now') * 1000, 'briefing', b.id
FROM briefings b
WHERE b.published = 1
  AND NOT EXISTS (SELECT 1 FROM topics t WHERE t.source_type = 'briefing' AND t.source_id = b.id);

INSERT INTO posts (topic_id, user_id, body, created_at)
SELECT t.id, t.created_by,
       COALESCE(NULLIF(b.summary, ''), 'A new briefing has been shared.') || char(10) || char(10) ||
       CASE WHEN b.url != '' THEN b.url || char(10) || char(10) ELSE '' END ||
       'Worth a read — what stood out to you?',
       t.created_at
FROM topics t JOIN briefings b ON b.id = t.source_id
WHERE t.source_type = 'briefing'
  AND NOT EXISTS (SELECT 1 FROM posts p WHERE p.topic_id = t.id);
