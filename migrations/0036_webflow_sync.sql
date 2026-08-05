-- Marketing-site sync: mirror approved, upcoming events into a Webflow CMS
-- collection so each event gets its own page at jointheconclave.com/event/{slug}.
--
-- webflow_item_id maps a portal event 1:1 to its Webflow CMS item, so the sync
-- can create / update / delete idempotently. Empty string = not yet synced.
ALTER TABLE events ADD COLUMN webflow_item_id TEXT NOT NULL DEFAULT '';

-- Content hash of the last payload pushed to Webflow. Lets the sync skip items
-- that haven't changed and avoid needless API writes/publishes.
ALTER TABLE events ADD COLUMN webflow_synced_hash TEXT NOT NULL DEFAULT '';
