-- A second batch of curated briefings from reputable third-party sources (HBR,
-- McKinsey-adjacent voices, Sequoia, a16z, Stratechery, First Round Review,
-- Paul Graham, Marketing Week, Andrew Chen), filed under Marketing / Leadership
-- / Technology. Published 'link' briefings; no cover image. Each INSERT is
-- guarded by NOT EXISTS on the URL so a link is never added twice. Additive.

INSERT INTO briefings (kind, title, summary, body, url, cover_key, cover_url, author_id, published, published_at, status, submitted_by, category_id, created_at, updated_at)
SELECT 'link', 'The Good-Better-Best Approach to Pricing', 'Harvard Business Review: a simple three-tier pricing structure — a stripped-down “good,” the current “better,” and a premium “best” — to win price-sensitive buyers and grow high-end spend.', '', 'https://hbr.org/2018/09/the-good-better-best-approach-to-pricing', '', '', NULL, 1, (strftime('%s','now') * 1000) - 0, 'approved', NULL, (SELECT id FROM briefing_categories WHERE slug = 'marketing'), (strftime('%s','now') * 1000), (strftime('%s','now') * 1000)
WHERE NOT EXISTS (SELECT 1 FROM briefings WHERE url = 'https://hbr.org/2018/09/the-good-better-best-approach-to-pricing');

INSERT INTO briefings (kind, title, summary, body, url, cover_key, cover_url, author_id, published, published_at, status, submitted_by, category_id, created_at, updated_at)
SELECT 'link', 'A Better Way to Map Brand Strategy', 'Harvard Business Review on the tension every brand navigates: being distinctive versus being central to its category — and how to tell where you actually stand.', '', 'https://hbr.org/2015/06/a-better-way-to-map-brand-strategy', '', '', NULL, 1, (strftime('%s','now') * 1000) - 60000, 'approved', NULL, (SELECT id FROM briefing_categories WHERE slug = 'marketing'), (strftime('%s','now') * 1000), (strftime('%s','now') * 1000)
WHERE NOT EXISTS (SELECT 1 FROM briefings WHERE url = 'https://hbr.org/2015/06/a-better-way-to-map-brand-strategy');

INSERT INTO briefings (kind, title, summary, body, url, cover_key, cover_url, author_id, published, published_at, status, submitted_by, category_id, created_at, updated_at)
SELECT 'link', 'Distinctiveness Is Marketers'' Main Challenge', 'Marketing Week: Mark Ritson on why instant recognition — distinctive brand assets — beats clever differentiation, and where most brands underinvest.', '', 'https://www.marketingweek.com/mark-ritson-brand-distinctive-assets/', '', '', NULL, 1, (strftime('%s','now') * 1000) - 120000, 'approved', NULL, (SELECT id FROM briefing_categories WHERE slug = 'marketing'), (strftime('%s','now') * 1000), (strftime('%s','now') * 1000)
WHERE NOT EXISTS (SELECT 1 FROM briefings WHERE url = 'https://www.marketingweek.com/mark-ritson-brand-distinctive-assets/');

INSERT INTO briefings (kind, title, summary, body, url, cover_key, cover_url, author_id, published, published_at, status, submitted_by, category_id, created_at, updated_at)
SELECT 'link', 'The Law of Shitty Clickthroughs', 'Andrew Chen: every acquisition channel decays as novelty wears off. The first banner ad got a 78% clickthrough — what that says about your marketing strategy.', '', 'https://andrewchen.com/the-law-of-shitty-clickthroughs/', '', '', NULL, 1, (strftime('%s','now') * 1000) - 180000, 'approved', NULL, (SELECT id FROM briefing_categories WHERE slug = 'marketing'), (strftime('%s','now') * 1000), (strftime('%s','now') * 1000)
WHERE NOT EXISTS (SELECT 1 FROM briefings WHERE url = 'https://andrewchen.com/the-law-of-shitty-clickthroughs/');

INSERT INTO briefings (kind, title, summary, body, url, cover_key, cover_url, author_id, published, published_at, status, submitted_by, category_id, created_at, updated_at)
SELECT 'link', 'How to Do Great Work', 'Paul Graham''s field guide to great work: choosing what to work on, following genuine curiosity, and the habits that compound into originality.', '', 'https://paulgraham.com/greatwork.html', '', '', NULL, 1, (strftime('%s','now') * 1000) - 240000, 'approved', NULL, (SELECT id FROM briefing_categories WHERE slug = 'leadership'), (strftime('%s','now') * 1000), (strftime('%s','now') * 1000)
WHERE NOT EXISTS (SELECT 1 FROM briefings WHERE url = 'https://paulgraham.com/greatwork.html');

INSERT INTO briefings (kind, title, summary, body, url, cover_key, cover_url, author_id, published, published_at, status, submitted_by, category_id, created_at, updated_at)
SELECT 'link', 'The Struggle', 'Ben Horowitz (a16z) on “the Struggle” — the emotional low of running a company when it''s caving in, why every great founder hits it, and why that''s where greatness comes from.', '', 'https://a16z.com/the-struggle/', '', '', NULL, 1, (strftime('%s','now') * 1000) - 300000, 'approved', NULL, (SELECT id FROM briefing_categories WHERE slug = 'leadership'), (strftime('%s','now') * 1000), (strftime('%s','now') * 1000)
WHERE NOT EXISTS (SELECT 1 FROM briefings WHERE url = 'https://a16z.com/the-struggle/');

INSERT INTO briefings (kind, title, summary, body, url, cover_key, cover_url, author_id, published, published_at, status, submitted_by, category_id, created_at, updated_at)
SELECT 'link', '''Give Away Your Legos'' and Other Commandments for Scaling Startups', 'First Round Review: Molly Graham''s classic on scaling — why growth means constantly handing off the work you love, and how to make peace with it.', '', 'https://review.firstround.com/give-away-your-legos-and-other-commandments-for-scaling-startups/', '', '', NULL, 1, (strftime('%s','now') * 1000) - 360000, 'approved', NULL, (SELECT id FROM briefing_categories WHERE slug = 'leadership'), (strftime('%s','now') * 1000), (strftime('%s','now') * 1000)
WHERE NOT EXISTS (SELECT 1 FROM briefings WHERE url = 'https://review.firstround.com/give-away-your-legos-and-other-commandments-for-scaling-startups/');

INSERT INTO briefings (kind, title, summary, body, url, cover_key, cover_url, author_id, published, published_at, status, submitted_by, category_id, created_at, updated_at)
SELECT 'link', 'Focus on Your First 10 Systems, Not Just Your First 10 Hires', 'First Round Review: a chief-of-staff playbook on the operating systems and cadence that keep a scaling company from cobbling itself together by accident.', '', 'https://review.firstround.com/focus-on-your-first-10-systems-not-just-your-first-10-hires-this-chief-of-staff-shares-his-playbook/', '', '', NULL, 1, (strftime('%s','now') * 1000) - 420000, 'approved', NULL, (SELECT id FROM briefing_categories WHERE slug = 'leadership'), (strftime('%s','now') * 1000), (strftime('%s','now') * 1000)
WHERE NOT EXISTS (SELECT 1 FROM briefings WHERE url = 'https://review.firstround.com/focus-on-your-first-10-systems-not-just-your-first-10-hires-this-chief-of-staff-shares-his-playbook/');

INSERT INTO briefings (kind, title, summary, body, url, cover_key, cover_url, author_id, published, published_at, status, submitted_by, category_id, created_at, updated_at)
SELECT 'link', 'Generative AI: A Creative New World', 'Sequoia Capital''s foundational essay on generative AI — how machines learning to create push the marginal cost of creative and knowledge work toward zero, and which industries get reinvented.', '', 'https://www.sequoiacap.com/article/generative-ai-a-creative-new-world/', '', '', NULL, 1, (strftime('%s','now') * 1000) - 480000, 'approved', NULL, (SELECT id FROM briefing_categories WHERE slug = 'technology'), (strftime('%s','now') * 1000), (strftime('%s','now') * 1000)
WHERE NOT EXISTS (SELECT 1 FROM briefings WHERE url = 'https://www.sequoiacap.com/article/generative-ai-a-creative-new-world/');

INSERT INTO briefings (kind, title, summary, body, url, cover_key, cover_url, author_id, published, published_at, status, submitted_by, category_id, created_at, updated_at)
SELECT 'link', 'AI and the Big Five', 'Ben Thompson (Stratechery) applies disruption theory to map how Apple, Amazon, Google, Microsoft, and Meta are each positioned to win — or lose — in AI.', '', 'https://stratechery.com/2023/ai-and-the-big-five/', '', '', NULL, 1, (strftime('%s','now') * 1000) - 540000, 'approved', NULL, (SELECT id FROM briefing_categories WHERE slug = 'technology'), (strftime('%s','now') * 1000), (strftime('%s','now') * 1000)
WHERE NOT EXISTS (SELECT 1 FROM briefings WHERE url = 'https://stratechery.com/2023/ai-and-the-big-five/');

INSERT INTO briefings (kind, title, summary, body, url, cover_key, cover_url, author_id, published, published_at, status, submitted_by, category_id, created_at, updated_at)
SELECT 'link', 'AI in 2025: Building Blocks Firmly in Place', 'Sequoia Capital''s state of AI: where the foundational pieces now stand, and what it means for the companies building on top of them.', '', 'https://www.sequoiacap.com/article/ai-in-2025/', '', '', NULL, 1, (strftime('%s','now') * 1000) - 600000, 'approved', NULL, (SELECT id FROM briefing_categories WHERE slug = 'technology'), (strftime('%s','now') * 1000), (strftime('%s','now') * 1000)
WHERE NOT EXISTS (SELECT 1 FROM briefings WHERE url = 'https://www.sequoiacap.com/article/ai-in-2025/');

INSERT INTO briefings (kind, title, summary, body, url, cover_key, cover_url, author_id, published, published_at, status, submitted_by, category_id, created_at, updated_at)
SELECT 'link', 'AI Integration and Modularization', 'Ben Thompson (Stratechery) on the strategic fork in AI: integrated players (Google as “the Apple of AI”) versus those betting the value chain commoditizes.', '', 'https://stratechery.com/2024/ai-integration-and-modularization/', '', '', NULL, 1, (strftime('%s','now') * 1000) - 660000, 'approved', NULL, (SELECT id FROM briefing_categories WHERE slug = 'technology'), (strftime('%s','now') * 1000), (strftime('%s','now') * 1000)
WHERE NOT EXISTS (SELECT 1 FROM briefings WHERE url = 'https://stratechery.com/2024/ai-integration-and-modularization/');
