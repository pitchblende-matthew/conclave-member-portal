-- Add the Conclave Westchester Launch Party to the events calendar.
-- starts_at is a Unix timestamp in ms: 2026-08-19 18:00 America/New_York (EDT)
-- = 1787176800000. Capacity 50 caps RSVPs. Status 'approved' so it's visible
-- immediately. DMA is derived from Scarsdale's ZIP so it surfaces in the New
-- York market. Editable/removable from Admin → Events like any other event.
INSERT INTO events
  (title, description, location, city, state, zip, dma_slug, dma_name,
   is_virtual, meeting_url, starts_at, capacity, status, submitted_by, created_at)
VALUES (
  'Conclave Westchester Launch Party',
  'The Conclave''s Westchester launch party. Join us for an evening at Golfzon Social — food and drinks provided. Limited to 50 guests.',
  'Golfzon Social, Scarsdale, NY',
  'Scarsdale', 'NY', '10583',
  COALESCE((SELECT dma_slug FROM zip_dma WHERE zip = '10583'), ''),
  COALESCE((SELECT dma_name FROM zip_dma WHERE zip = '10583'), ''),
  0, '',
  1787176800000,
  50,
  'approved',
  (SELECT id FROM users WHERE email = 'matthew@pitchblende.net'),
  strftime('%s','now') * 1000
);
