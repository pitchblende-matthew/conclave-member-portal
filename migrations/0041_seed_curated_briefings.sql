-- Curated briefings from reputable third-party sources (HBR, McKinsey, a16z,
-- Stratechery, First Round Review, Paul Graham, Marketing Week, Lenny's
-- Newsletter), filed under Marketing / Leadership / Technology for the
-- owner/operator/founder audience. Published 'link' briefings; no cover image
-- (third-party links). Each INSERT is guarded by NOT EXISTS on the URL so a
-- link is never added twice. Additive; runs once on deploy.

INSERT INTO briefings (kind, title, summary, body, url, cover_key, cover_url, author_id, published, published_at, status, submitted_by, category_id, created_at, updated_at)
SELECT 'link', 'Put Marketing at the Core of Your Growth Strategy', 'Harvard Business Review: companies that treat marketing as central to their growth strategy, not a cost center, consistently outperform their peers.', '', 'https://hbr.org/2024/03/put-marketing-at-the-core-of-your-growth-strategy', '', '', NULL, 1, (strftime('%s','now') * 1000) - 0, 'approved', NULL, (SELECT id FROM briefing_categories WHERE slug = 'marketing'), (strftime('%s','now') * 1000), (strftime('%s','now') * 1000)
WHERE NOT EXISTS (SELECT 1 FROM briefings WHERE url = 'https://hbr.org/2024/03/put-marketing-at-the-core-of-your-growth-strategy');

INSERT INTO briefings (kind, title, summary, body, url, cover_key, cover_url, author_id, published, published_at, status, submitted_by, category_id, created_at, updated_at)
SELECT 'link', 'Past Forward: The Modern Rethinking of Marketing''s Core', 'McKinsey on why brand, distinctiveness, and a clear value proposition are resurging as the durable levers of growth.', '', 'https://www.mckinsey.com/capabilities/growth-marketing-and-sales/our-insights/past-forward-the-modern-rethinking-of-marketings-core', '', '', NULL, 1, (strftime('%s','now') * 1000) - 60000, 'approved', NULL, (SELECT id FROM briefing_categories WHERE slug = 'marketing'), (strftime('%s','now') * 1000), (strftime('%s','now') * 1000)
WHERE NOT EXISTS (SELECT 1 FROM briefings WHERE url = 'https://www.mckinsey.com/capabilities/growth-marketing-and-sales/our-insights/past-forward-the-modern-rethinking-of-marketings-core');

INSERT INTO briefings (kind, title, summary, body, url, cover_key, cover_url, author_id, published, published_at, status, submitted_by, category_id, created_at, updated_at)
SELECT 'link', 'Connecting for Growth: A Makeover for Your Marketing Operating Model', 'McKinsey on rewiring how the marketing function actually operates so it drives growth, not just campaigns.', '', 'https://www.mckinsey.com/capabilities/growth-marketing-and-sales/our-insights/connecting-for-growth-a-makeover-for-your-marketing-operating-model', '', '', NULL, 1, (strftime('%s','now') * 1000) - 120000, 'approved', NULL, (SELECT id FROM briefing_categories WHERE slug = 'marketing'), (strftime('%s','now') * 1000), (strftime('%s','now') * 1000)
WHERE NOT EXISTS (SELECT 1 FROM briefings WHERE url = 'https://www.mckinsey.com/capabilities/growth-marketing-and-sales/our-insights/connecting-for-growth-a-makeover-for-your-marketing-operating-model');

INSERT INTO briefings (kind, title, summary, body, url, cover_key, cover_url, author_id, published, published_at, status, submitted_by, category_id, created_at, updated_at)
SELECT 'link', 'Les Binet: Long-Term Brand Building Is the Key to Firmer Pricing', 'Marketing Week: Les Binet on why sustained brand building, not just performance activation, is what earns pricing power and profit.', '', 'https://www.marketingweek.com/creativity-pays-les-binet/', '', '', NULL, 1, (strftime('%s','now') * 1000) - 180000, 'approved', NULL, (SELECT id FROM briefing_categories WHERE slug = 'marketing'), (strftime('%s','now') * 1000), (strftime('%s','now') * 1000)
WHERE NOT EXISTS (SELECT 1 FROM briefings WHERE url = 'https://www.marketingweek.com/creativity-pays-les-binet/');

INSERT INTO briefings (kind, title, summary, body, url, cover_key, cover_url, author_id, published, published_at, status, submitted_by, category_id, created_at, updated_at)
SELECT 'link', 'The 95:5 Rule Is the New 60:40 Rule', 'Marketing Week: the LinkedIn B2B Institute''s case that ~95% of buyers aren''t in-market today, so brand is what wins future demand.', '', 'https://www.marketingweek.com/peter-weinberg-jon-lombardo-95-5-rule/', '', '', NULL, 1, (strftime('%s','now') * 1000) - 240000, 'approved', NULL, (SELECT id FROM briefing_categories WHERE slug = 'marketing'), (strftime('%s','now') * 1000), (strftime('%s','now') * 1000)
WHERE NOT EXISTS (SELECT 1 FROM briefings WHERE url = 'https://www.marketingweek.com/peter-weinberg-jon-lombardo-95-5-rule/');

INSERT INTO briefings (kind, title, summary, body, url, cover_key, cover_url, author_id, published, published_at, status, submitted_by, category_id, created_at, updated_at)
SELECT 'link', 'The Strengths and Weaknesses That Set Founders Apart', 'Harvard Business Review on what “founder mode” really means, and how founder-led companies differ from manager-run ones.', '', 'https://hbr.org/2024/10/the-strengths-and-weaknesses-that-set-founders-apart', '', '', NULL, 1, (strftime('%s','now') * 1000) - 300000, 'approved', NULL, (SELECT id FROM briefing_categories WHERE slug = 'leadership'), (strftime('%s','now') * 1000), (strftime('%s','now') * 1000)
WHERE NOT EXISTS (SELECT 1 FROM briefings WHERE url = 'https://hbr.org/2024/10/the-strengths-and-weaknesses-that-set-founders-apart');

INSERT INTO briefings (kind, title, summary, body, url, cover_key, cover_url, author_id, published, published_at, status, submitted_by, category_id, created_at, updated_at)
SELECT 'link', 'Dear Startup CEOs', 'First Round Review: letters from experienced CEOs to their peers on the lessons that made the biggest difference.', '', 'https://review.firstround.com/dear-startup-ceos/', '', '', NULL, 1, (strftime('%s','now') * 1000) - 360000, 'approved', NULL, (SELECT id FROM briefing_categories WHERE slug = 'leadership'), (strftime('%s','now') * 1000), (strftime('%s','now') * 1000)
WHERE NOT EXISTS (SELECT 1 FROM briefings WHERE url = 'https://review.firstround.com/dear-startup-ceos/');

INSERT INTO briefings (kind, title, summary, body, url, cover_key, cover_url, author_id, published, published_at, status, submitted_by, category_id, created_at, updated_at)
SELECT 'link', 'Leading After the Founder', 'Harvard Business Review: founder-to-successor handovers fail more often than other transitions — how to get them right.', '', 'https://hbr.org/2026/01/leading-after-the-founder', '', '', NULL, 1, (strftime('%s','now') * 1000) - 420000, 'approved', NULL, (SELECT id FROM briefing_categories WHERE slug = 'leadership'), (strftime('%s','now') * 1000), (strftime('%s','now') * 1000)
WHERE NOT EXISTS (SELECT 1 FROM briefings WHERE url = 'https://hbr.org/2026/01/leading-after-the-founder');

INSERT INTO briefings (kind, title, summary, body, url, cover_key, cover_url, author_id, published, published_at, status, submitted_by, category_id, created_at, updated_at)
SELECT 'link', 'Founder Mode', 'Paul Graham''s essay that started the “founder mode” debate: why founder-run companies operate differently than managed ones.', '', 'https://paulgraham.com/foundermode.html', '', '', NULL, 1, (strftime('%s','now') * 1000) - 480000, 'approved', NULL, (SELECT id FROM briefing_categories WHERE slug = 'leadership'), (strftime('%s','now') * 1000), (strftime('%s','now') * 1000)
WHERE NOT EXISTS (SELECT 1 FROM briefings WHERE url = 'https://paulgraham.com/foundermode.html');

INSERT INTO briefings (kind, title, summary, body, url, cover_key, cover_url, author_id, published, published_at, status, submitted_by, category_id, created_at, updated_at)
SELECT 'link', 'Do Things That Don''t Scale', 'Paul Graham''s classic case for manual, unscalable effort in the early days — recruiting users by hand and delighting them.', '', 'https://paulgraham.com/ds.html', '', '', NULL, 1, (strftime('%s','now') * 1000) - 540000, 'approved', NULL, (SELECT id FROM briefing_categories WHERE slug = 'leadership'), (strftime('%s','now') * 1000), (strftime('%s','now') * 1000)
WHERE NOT EXISTS (SELECT 1 FROM briefings WHERE url = 'https://paulgraham.com/ds.html');

INSERT INTO briefings (kind, title, summary, body, url, cover_key, cover_url, author_id, published, published_at, status, submitted_by, category_id, created_at, updated_at)
SELECT 'link', 'Essential Reading for Product Builders', 'Lenny''s Newsletter: a curated set of timeless reads every product, growth, and operating leader should have on file.', '', 'https://www.lennysnewsletter.com/p/essential-reading-for-product-builderspart', '', '', NULL, 1, (strftime('%s','now') * 1000) - 600000, 'approved', NULL, (SELECT id FROM briefing_categories WHERE slug = 'leadership'), (strftime('%s','now') * 1000), (strftime('%s','now') * 1000)
WHERE NOT EXISTS (SELECT 1 FROM briefings WHERE url = 'https://www.lennysnewsletter.com/p/essential-reading-for-product-builderspart');

INSERT INTO briefings (kind, title, summary, body, url, cover_key, cover_url, author_id, published, published_at, status, submitted_by, category_id, created_at, updated_at)
SELECT 'link', 'How 100 Enterprise CIOs Are Building and Buying Gen AI', 'Andreessen Horowitz on what real enterprise AI budgets, buying behavior, and model choices look like now.', '', 'https://a16z.com/ai-enterprise-2025/', '', '', NULL, 1, (strftime('%s','now') * 1000) - 660000, 'approved', NULL, (SELECT id FROM briefing_categories WHERE slug = 'technology'), (strftime('%s','now') * 1000), (strftime('%s','now') * 1000)
WHERE NOT EXISTS (SELECT 1 FROM briefings WHERE url = 'https://a16z.com/ai-enterprise-2025/');

INSERT INTO briefings (kind, title, summary, body, url, cover_key, cover_url, author_id, published, published_at, status, submitted_by, category_id, created_at, updated_at)
SELECT 'link', 'The State of AI: Agents, Innovation, and Transformation', 'McKinsey''s annual benchmark of where AI adoption actually stands across business functions.', '', 'https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai', '', '', NULL, 1, (strftime('%s','now') * 1000) - 720000, 'approved', NULL, (SELECT id FROM briefing_categories WHERE slug = 'technology'), (strftime('%s','now') * 1000), (strftime('%s','now') * 1000)
WHERE NOT EXISTS (SELECT 1 FROM briefings WHERE url = 'https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai');

INSERT INTO briefings (kind, title, summary, body, url, cover_key, cover_url, author_id, published, published_at, status, submitted_by, category_id, created_at, updated_at)
SELECT 'link', 'Redesign Work for People and AI', 'McKinsey: the real AI question for leaders is redesigning how work gets done around people plus AI agents.', '', 'https://www.mckinsey.com/mgi/media-center/a-new-years-resolution-for-leaders-redesign-work-for-people-and-ai', '', '', NULL, 1, (strftime('%s','now') * 1000) - 780000, 'approved', NULL, (SELECT id FROM briefing_categories WHERE slug = 'technology'), (strftime('%s','now') * 1000), (strftime('%s','now') * 1000)
WHERE NOT EXISTS (SELECT 1 FROM briefings WHERE url = 'https://www.mckinsey.com/mgi/media-center/a-new-years-resolution-for-leaders-redesign-work-for-people-and-ai');

INSERT INTO briefings (kind, title, summary, body, url, cover_key, cover_url, author_id, published, published_at, status, submitted_by, category_id, created_at, updated_at)
SELECT 'link', 'Aggregation Theory', 'Ben Thompson''s (Stratechery) foundational framework for how the internet reshapes competition and who captures value.', '', 'https://stratechery.com/aggregation-theory/', '', '', NULL, 1, (strftime('%s','now') * 1000) - 840000, 'approved', NULL, (SELECT id FROM briefing_categories WHERE slug = 'technology'), (strftime('%s','now') * 1000), (strftime('%s','now') * 1000)
WHERE NOT EXISTS (SELECT 1 FROM briefings WHERE url = 'https://stratechery.com/aggregation-theory/');

INSERT INTO briefings (kind, title, summary, body, url, cover_key, cover_url, author_id, published, published_at, status, submitted_by, category_id, created_at, updated_at)
SELECT 'link', 'Leaders, Gainers, and Unexpected Winners in the Enterprise AI Arms Race', 'Andreessen Horowitz on who''s actually winning enterprise AI, and where the surprises are in model adoption.', '', 'https://a16z.com/leaders-gainers-and-unexpected-winners-in-the-enterprise-ai-arms-race/', '', '', NULL, 1, (strftime('%s','now') * 1000) - 900000, 'approved', NULL, (SELECT id FROM briefing_categories WHERE slug = 'technology'), (strftime('%s','now') * 1000), (strftime('%s','now') * 1000)
WHERE NOT EXISTS (SELECT 1 FROM briefings WHERE url = 'https://a16z.com/leaders-gainers-and-unexpected-winners-in-the-enterprise-ai-arms-race/');
