-- Optional discoverability limits per member:
--   discover_region_only — only members in the same media market can find me
--   discover_peers_only  — only members sharing my function or seniority can find me
-- Both default off. Applied to directory/search/browse listings (soft hide);
-- direct profile links still resolve. Additive; auto-applied on deploy.

ALTER TABLE users ADD COLUMN discover_region_only INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN discover_peers_only  INTEGER NOT NULL DEFAULT 0;
