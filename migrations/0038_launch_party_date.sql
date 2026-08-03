-- Move the Conclave Westchester Launch Party to its confirmed date:
-- 2026-09-23 18:00 America/New_York (EDT) = 1790200800000 (Unix ms).
-- Seeded in 0037 with an Aug 19 placeholder. Same venue/capacity/details.
UPDATE events
SET starts_at = 1790200800000
WHERE title = 'Conclave Westchester Launch Party';
