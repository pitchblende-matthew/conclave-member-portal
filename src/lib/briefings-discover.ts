import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "./db";
import { fetchOgImage } from "./opengraph";
import { announceBriefing } from "./board-announce";
import { slackAnnounceBriefing } from "./slack-bridge";
import { postSlackCategory } from "./slack";
import { siteUrl } from "./email";

// Daily briefing discovery: pull fresh industry articles from a curated set of
// RSS feeds, let Claude pick the few most worth members' time (and write clean
// summaries + file them under a topic), then publish them as 'link' briefings.
// Same external-scheduler pattern as the other jobs (GitHub Action → this
// endpoint). Insert-only and deduped by URL, so re-runs never double-post.
//
// Env (Webflow Cloud):
//   ANTHROPIC_API_KEY        - enables Claude ranking/summaries. Without it the
//                              job still runs, falling back to newest-first.
//   BRIEFINGS_LLM_MODEL      - optional model override (default claude-sonnet-5).
//   BRIEFINGS_DISCOVER_FEEDS - optional comma-separated RSS URLs to replace the
//                              default feed list.
//   DIGEST_SECRET            - guards the /api/briefings/discover endpoint.

const RECENT_DAYS = 4; // only consider items published within this window
const CANDIDATE_CAP = 40; // most-recent N sent to Claude, to bound tokens
const MAX_PICKS = 5;
const MIN_PICKS = 3;
const SLACK_ANNOUNCE_CAP = 6;
const DEFAULT_MODEL = "claude-sonnet-5";

// Curated feeds for the Conclave audience (marketing / advertising / media).
const DEFAULT_FEEDS: { url: string; source: string }[] = [
  { url: "https://digiday.com/feed/", source: "Digiday" },
  { url: "https://www.marketingdive.com/feeds/news/", source: "Marketing Dive" },
  { url: "https://www.adweek.com/feed/", source: "Adweek" },
  { url: "https://www.thedrum.com/rss.xml", source: "The Drum" },
  { url: "https://searchengineland.com/feed", source: "Search Engine Land" },
  { url: "https://www.socialmediatoday.com/feeds/news/", source: "Social Media Today" },
  { url: "https://martech.org/feed/", source: "MarTech" },
  { url: "https://contentmarketinginstitute.com/feed/", source: "Content Marketing Institute" },
];

const CATEGORY_SLUGS = ["marketing", "finance-tax", "operations", "sales", "legal", "technology", "leadership", "funding"] as const;
type CategorySlug = (typeof CATEGORY_SLUGS)[number];

type Env = {
  ANTHROPIC_API_KEY?: string;
  BRIEFINGS_LLM_MODEL?: string;
  BRIEFINGS_DISCOVER_FEEDS?: string;
};

function readEnv(): Env {
  try {
    const { env } = getCloudflareContext() as unknown as { env: Env };
    return env ?? {};
  } catch {
    return {};
  }
}

function feedList(env: Env): { url: string; source: string }[] {
  const raw = (env.BRIEFINGS_DISCOVER_FEEDS || "").trim();
  if (!raw) return DEFAULT_FEEDS;
  return raw
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean)
    .map((url) => ({ url, source: hostOf(url) }));
}

function hostOf(u: string): string {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
}

// ---- feed parsing (no XML lib on the edge; regex is enough for RSS/Atom) -----

type FeedItem = { title: string; url: string; summary: string; published: number; source: string };

function stripCdata(s: string): string {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#x2f;/gi, "/")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&nbsp;/g, " ");
}

function stripHtml(s: string): string {
  return decodeEntities(stripCdata(s).replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function tagText(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? m[1] : "";
}

function itemLink(block: string): string {
  // Atom: <link href="…" rel="alternate"/> — prefer alternate, else first href.
  const alt = block.match(/<link[^>]*rel=["']?alternate["']?[^>]*href=["']([^"']+)["']/i) || block.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["']?alternate/i);
  if (alt) return alt[1];
  const href = block.match(/<link[^>]*href=["']([^"']+)["']/i);
  if (href) return href[1];
  // RSS: <link>URL</link>
  const rss = tagText(block, "link");
  return stripCdata(rss).trim();
}

function parseFeed(xml: string, source: string): FeedItem[] {
  const blocks = xml.match(/<item[\s\S]*?<\/item>|<entry[\s\S]*?<\/entry>/gi) || [];
  const out: FeedItem[] = [];
  for (const block of blocks) {
    const title = stripHtml(tagText(block, "title")).slice(0, 300);
    const url = decodeEntities(itemLink(block)).trim();
    if (!title || !/^https?:\/\//i.test(url)) continue;
    const rawSummary = tagText(block, "description") || tagText(block, "summary") || tagText(block, "content");
    const summary = stripHtml(rawSummary).slice(0, 500);
    const dateStr = stripHtml(tagText(block, "pubDate") || tagText(block, "published") || tagText(block, "updated"));
    const parsed = dateStr ? Date.parse(dateStr) : NaN;
    out.push({ title, url, summary, published: Number.isNaN(parsed) ? Date.now() : parsed, source });
  }
  return out;
}

// Normalize a URL for dedup: drop query/hash + trailing slash, lowercase host.
function normalizeUrl(u: string): string {
  try {
    const url = new URL(u);
    url.hash = "";
    url.search = "";
    let s = `${url.protocol}//${url.hostname.toLowerCase()}${url.pathname}`;
    if (s.endsWith("/") && url.pathname !== "/") s = s.slice(0, -1);
    return s;
  } catch {
    return u.trim();
  }
}

async function fetchFeed(url: string, source: string): Promise<FeedItem[]> {
  const res = await fetch(url, {
    headers: { "User-Agent": "ConclaveBriefings/1.0 (+https://www.jointheconclave.com)", accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*" },
  });
  if (!res.ok) throw new Error(`${source} ${res.status}`);
  return parseFeed(await res.text(), source);
}

// ---- Claude ranking ---------------------------------------------------------

type Pick = { index: number; summary: string; category: CategorySlug };

function keywordCategory(text: string): CategorySlug {
  const n = text.toLowerCase();
  if (/(seo|\bai\b|tech|search|platform|automation|analytics|data|adtech|martech|privacy|cookie)/.test(n)) return "technology";
  if (/(ceo|hire|hiring|layoff|leadership|exec|appoint|promot|agency wins|account win)/.test(n)) return "leadership";
  if (/(sales|revenue|pitch|new business|client win|commerce|retail media)/.test(n)) return "sales";
  return "marketing";
}

async function rankWithClaude(apiKey: string, model: string, candidates: FeedItem[]): Promise<Pick[]> {
  const list = candidates
    .map((c, i) => `[${i}] ${c.title} — ${c.source}${c.summary ? `\n    ${c.summary.slice(0, 220)}` : ""}`)
    .join("\n");
  const prompt =
    `You are the editor of a private professional network for senior marketing, advertising, and media leaders. ` +
    `From the candidate articles below, choose the ${MIN_PICKS}-${MAX_PICKS} most valuable and genuinely newsworthy for that audience. ` +
    `Favor substantive industry news, analysis, and trends; skip press releases, thin listicles, pure product promos, and anything off-topic or duplicative. ` +
    `For each pick, write a crisp one-sentence summary (max 180 chars, no hype or clickbait) and assign one category from: ${CATEGORY_SLUGS.join(", ")}.\n\n` +
    `Return ONLY a JSON object: {"picks":[{"index":<number>,"summary":"<text>","category":"<slug>"}]} with no prose or code fences.\n\n` +
    `Candidates:\n${list}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, max_tokens: 1024, messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = (data.content || []).map((b) => b.text || "").join("").trim();
  const json = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = json.indexOf("{");
  const parsed = JSON.parse(start >= 0 ? json.slice(start, json.lastIndexOf("}") + 1) : json) as { picks?: Pick[] };
  const picks = Array.isArray(parsed.picks) ? parsed.picks : [];
  const seen = new Set<number>();
  const clean: Pick[] = [];
  for (const p of picks) {
    const index = Number(p.index);
    if (!Number.isInteger(index) || index < 0 || index >= candidates.length || seen.has(index)) continue;
    seen.add(index);
    const category = (CATEGORY_SLUGS as readonly string[]).includes(p.category) ? (p.category as CategorySlug) : keywordCategory(`${candidates[index].title} ${p.summary || ""}`);
    const summary = String(p.summary || candidates[index].summary || "").slice(0, 200);
    clean.push({ index, summary, category });
    if (clean.length >= MAX_PICKS) break;
  }
  return clean;
}

export type DiscoverResult = {
  ok: boolean;
  created: number;
  candidates: number;
  model: string;
  titles: string[];
  errors: string[];
};

export async function discoverBriefings(): Promise<DiscoverResult> {
  const env = readEnv();
  const errors: string[] = [];
  const db = getDb();

  // 1) Gather candidates from every feed (best-effort per feed).
  const feeds = feedList(env);
  const settled = await Promise.allSettled(feeds.map((f) => fetchFeed(f.url, f.source)));
  let items: FeedItem[] = [];
  settled.forEach((r, i) => {
    if (r.status === "fulfilled") items.push(...r.value);
    else errors.push(`feed ${feeds[i].source}: ${String(r.reason)}`);
  });

  // 2) Recent only, dedup within run + against what's already stored.
  const cutoff = Date.now() - RECENT_DAYS * 86400000;
  const { results: existingRows } = await db.prepare("SELECT url FROM briefings").all<{ url: string }>();
  const existing = new Set(existingRows.map((r) => normalizeUrl(r.url)));
  const seen = new Set<string>();
  items = items
    .filter((it) => it.published >= cutoff)
    .filter((it) => {
      const key = normalizeUrl(it.url);
      if (existing.has(key) || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.published - a.published)
    .slice(0, CANDIDATE_CAP);

  const result: DiscoverResult = { ok: true, created: 0, candidates: items.length, model: "recency-fallback", errors, titles: [] };
  if (items.length === 0) return result;

  // 3) Let Claude pick + summarize; fall back to newest-first if unavailable.
  let picks: Pick[] = [];
  const apiKey = env.ANTHROPIC_API_KEY || "";
  if (apiKey) {
    const model = env.BRIEFINGS_LLM_MODEL || DEFAULT_MODEL;
    try {
      picks = await rankWithClaude(apiKey, model, items);
      result.model = model;
    } catch (e) {
      errors.push(`rank: ${String(e)}`);
    }
  }
  if (picks.length === 0) {
    picks = items.slice(0, MAX_PICKS).map((it, index) => ({ index, summary: it.summary.slice(0, 200), category: keywordCategory(`${it.title} ${it.summary}`) }));
  }

  // 4) Category slug → id.
  const { results: catRows } = await db.prepare("SELECT id, slug FROM briefing_categories").all<{ id: number; slug: string }>();
  const catId = new Map(catRows.map((c) => [c.slug, c.id]));

  // 5) Insert each pick as a published 'link' briefing, open a thread, collect for Slack.
  const created: { id: number; title: string; url: string; summary: string }[] = [];
  for (const pick of picks) {
    const it = items[pick.index];
    try {
      const now = Date.now();
      const cover = (await fetchOgImage(it.url).catch(() => null)) || "";
      const categoryId = catId.get(pick.category) ?? catId.get("marketing") ?? 0;
      const ins = await db
        .prepare(
          `INSERT INTO briefings (kind, title, summary, body, url, cover_key, cover_url, author_id, published, published_at, status, submitted_by, category_id, created_at, updated_at)
           VALUES ('link', ?, ?, '', ?, '', ?, NULL, 1, ?, 'approved', NULL, ?, ?, ?)`
        )
        .bind(it.title, pick.summary, it.url, cover, it.published || now, categoryId, now, now)
        .run();
      const id = Number(ins.meta.last_row_id);
      created.push({ id, title: it.title, url: it.url, summary: pick.summary });
      await announceBriefing(id, { title: it.title, summary: pick.summary, url: it.url });
    } catch (e) {
      errors.push(`insert "${it.title.slice(0, 60)}": ${String(e)}`);
    }
  }
  result.created = created.length;
  result.titles = created.map((c) => c.title);

  // 6) Announce to Slack (each, or a summary line if it's ever a big run).
  try {
    if (created.length > 0 && created.length <= SLACK_ANNOUNCE_CAP) {
      for (const b of created) await slackAnnounceBriefing({ id: b.id, kind: "link", title: b.title, url: b.url, summary: b.summary });
    } else if (created.length > SLACK_ANNOUNCE_CAP) {
      await postSlackCategory("briefings", `:newspaper: *${created.length} new briefings* just published — <${siteUrl("/briefings")}|browse them>`);
    }
  } catch (e) {
    errors.push(`slack announce: ${String(e)}`);
  }

  result.ok = result.created > 0 || errors.length === 0;
  return result;
}
