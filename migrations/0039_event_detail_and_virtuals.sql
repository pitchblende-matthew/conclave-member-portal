-- (1) Richer description for the Westchester Launch Party.
UPDATE events
SET description = 'The inaugural Conclave gathering in Westchester. Join us for an evening at Golfzon Social in Scarsdale — food, drinks, and the owners, operators, and founders building modern growth across the metro. Casual and off the record; no sponsors, no keynotes, no agenda beyond good conversation and the people you actually wanted to meet. Space is limited to 50 — RSVP to hold your spot.'
WHERE title = 'Conclave Westchester Launch Party';

-- (2) Monthly virtual welcome sessions for new members, starting October 2026.
-- starts_at = first Wednesday of each month, 12:00 PM America/New_York (Unix ms).
-- Virtual (shows for every member regardless of market); capacity 0 = no cap;
-- a meeting link gets added from Admin -> Events closer to each date.
INSERT INTO events
  (title, description, location, city, state, zip, dma_slug, dma_name,
   is_virtual, meeting_url, starts_at, capacity, status, submitted_by, created_at)
VALUES
  ('New Member Welcome (Virtual)', 'A monthly virtual welcome for members who''ve recently joined. Meet the team and other newcomers, get oriented, and find the rooms, markets, and people most useful to you. Off the record, about 45 minutes. A meeting link is added closer to the date.', 'Virtual', '', '', '', '', '', 1, '', 1791388800000, 0, 'approved', (SELECT id FROM users WHERE email = 'matthew@pitchblende.net'), strftime('%s','now') * 1000),
  ('New Member Welcome (Virtual)', 'A monthly virtual welcome for members who''ve recently joined. Meet the team and other newcomers, get oriented, and find the rooms, markets, and people most useful to you. Off the record, about 45 minutes. A meeting link is added closer to the date.', 'Virtual', '', '', '', '', '', 1, '', 1793811600000, 0, 'approved', (SELECT id FROM users WHERE email = 'matthew@pitchblende.net'), strftime('%s','now') * 1000),
  ('New Member Welcome (Virtual)', 'A monthly virtual welcome for members who''ve recently joined. Meet the team and other newcomers, get oriented, and find the rooms, markets, and people most useful to you. Off the record, about 45 minutes. A meeting link is added closer to the date.', 'Virtual', '', '', '', '', '', 1, '', 1796230800000, 0, 'approved', (SELECT id FROM users WHERE email = 'matthew@pitchblende.net'), strftime('%s','now') * 1000),
  ('New Member Welcome (Virtual)', 'A monthly virtual welcome for members who''ve recently joined. Meet the team and other newcomers, get oriented, and find the rooms, markets, and people most useful to you. Off the record, about 45 minutes. A meeting link is added closer to the date.', 'Virtual', '', '', '', '', '', 1, '', 1799254800000, 0, 'approved', (SELECT id FROM users WHERE email = 'matthew@pitchblende.net'), strftime('%s','now') * 1000),
  ('New Member Welcome (Virtual)', 'A monthly virtual welcome for members who''ve recently joined. Meet the team and other newcomers, get oriented, and find the rooms, markets, and people most useful to you. Off the record, about 45 minutes. A meeting link is added closer to the date.', 'Virtual', '', '', '', '', '', 1, '', 1801674000000, 0, 'approved', (SELECT id FROM users WHERE email = 'matthew@pitchblende.net'), strftime('%s','now') * 1000),
  ('New Member Welcome (Virtual)', 'A monthly virtual welcome for members who''ve recently joined. Meet the team and other newcomers, get oriented, and find the rooms, markets, and people most useful to you. Off the record, about 45 minutes. A meeting link is added closer to the date.', 'Virtual', '', '', '', '', '', 1, '', 1804093200000, 0, 'approved', (SELECT id FROM users WHERE email = 'matthew@pitchblende.net'), strftime('%s','now') * 1000);
