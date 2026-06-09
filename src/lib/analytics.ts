import { getDb } from "./db";

const DAY = 86400000;
const WEEK = 7 * DAY;

type Count = { name: string; n: number };

export type Analytics = {
  members: { approved: number; pending: number; declined: number; new7: number; new30: number; onboarded: number; alpha: number; admins: number };
  active30: number;
  new30: { topics: number; posts: number; events: number; rsvps: number; briefings: number; listings: number; messages: number; connections: number };
  totals: { companies: number; topics: number; posts: number; events: number; rsvps: number; briefings: number; connections: number; messages: number; jobs: number; businesses: number; feedbackOpen: number };
  markets: Count[];
  functions: Count[];
  seniorities: Count[];
  weekly: { weeksAgo: number; n: number }[]; // oldest → newest, 8 buckets
};

export async function getAnalytics(): Promise<Analytics> {
  const db = getDb();
  const now = Date.now();
  const d7 = now - 7 * DAY;
  const d30 = now - 30 * DAY;

  const one = async (sql: string, ...binds: (string | number)[]): Promise<number> => {
    const row = await db.prepare(sql).bind(...binds).first<{ n: number }>();
    return row?.n ?? 0;
  };
  const list = async (sql: string, ...binds: (string | number)[]): Promise<Count[]> =>
    (await db.prepare(sql).bind(...binds).all<Count>()).results;

  const [
    approved, pending, declined, new7, new30m, onboarded, alpha, admins,
    active30,
    nTopics, nPosts, nEvents, nRsvps, nBriefings, nListings, nMessages, nConnections,
    tCompanies, tTopics, tPosts, tEvents, tRsvps, tBriefings, tConnections, tMessages, tJobs, tBiz, tFeedback,
  ] = await Promise.all([
    one("SELECT COUNT(*) n FROM users WHERE status='approved'"),
    one("SELECT COUNT(*) n FROM users WHERE status='pending'"),
    one("SELECT COUNT(*) n FROM users WHERE status='declined'"),
    one("SELECT COUNT(*) n FROM users WHERE status='approved' AND created_at>=?", d7),
    one("SELECT COUNT(*) n FROM users WHERE status='approved' AND created_at>=?", d30),
    one("SELECT COUNT(*) n FROM users WHERE status='approved' AND onboarded=1"),
    one("SELECT COUNT(*) n FROM users WHERE alpha_tester=1"),
    one("SELECT COUNT(*) n FROM users WHERE is_admin=1"),
    // distinct members who took an action in the last 30 days
    one(
      `SELECT COUNT(*) n FROM (
         SELECT user_id uid FROM posts WHERE created_at>=?
         UNION SELECT user_id FROM rsvps WHERE created_at>=?
         UNION SELECT sender_id FROM messages WHERE created_at>=?
         UNION SELECT created_by FROM topics WHERE created_at>=?
         UNION SELECT requester_id FROM connections WHERE created_at>=?
         UNION SELECT user_id FROM listings WHERE created_at>=?
       )`,
      d30, d30, d30, d30, d30, d30
    ),
    // new content (30d)
    one("SELECT COUNT(*) n FROM topics WHERE created_at>=?", d30),
    one("SELECT COUNT(*) n FROM posts WHERE created_at>=?", d30),
    one("SELECT COUNT(*) n FROM events WHERE created_at>=?", d30),
    one("SELECT COUNT(*) n FROM rsvps WHERE created_at>=?", d30),
    one("SELECT COUNT(*) n FROM briefings WHERE created_at>=?", d30),
    one("SELECT COUNT(*) n FROM listings WHERE created_at>=?", d30),
    one("SELECT COUNT(*) n FROM messages WHERE created_at>=?", d30),
    one("SELECT COUNT(*) n FROM connections WHERE created_at>=?", d30),
    // all-time totals
    one("SELECT COUNT(*) n FROM companies"),
    one("SELECT COUNT(*) n FROM topics"),
    one("SELECT COUNT(*) n FROM posts"),
    one("SELECT COUNT(*) n FROM events WHERE status='approved'"),
    one("SELECT COUNT(*) n FROM rsvps"),
    one("SELECT COUNT(*) n FROM briefings WHERE published=1"),
    one("SELECT COUNT(*) n FROM connections WHERE status='accepted'"),
    one("SELECT COUNT(*) n FROM messages"),
    one("SELECT COUNT(*) n FROM listings WHERE kind='job' AND status='open'"),
    one("SELECT COUNT(*) n FROM listings WHERE kind='business' AND status='open'"),
    one("SELECT COUNT(*) n FROM feedback WHERE status!='closed'"),
  ]);

  const [markets, functions, seniorities, weeklyRows] = await Promise.all([
    list("SELECT dma_name AS name, COUNT(*) n FROM users WHERE status='approved' AND dma_name!='' GROUP BY dma_slug ORDER BY n DESC, name LIMIT 8"),
    list("SELECT f.name AS name, COUNT(*) n FROM users u JOIN functions f ON f.id=u.function_id WHERE u.status='approved' GROUP BY f.id ORDER BY n DESC, name LIMIT 8"),
    list("SELECT s.name AS name, COUNT(*) n FROM users u JOIN seniorities s ON s.id=u.seniority_id WHERE u.status='approved' GROUP BY s.id ORDER BY n DESC, name LIMIT 8"),
    list(
      `SELECT CAST((? - created_at)/${WEEK} AS INTEGER) AS name, COUNT(*) n
       FROM users WHERE status='approved' AND created_at>=? GROUP BY name`,
      now, now - 8 * WEEK
    ),
  ]);

  // Fill 8 weekly buckets (index 0 = oldest of the window, 7 = current week).
  const byWeek = new Map(weeklyRows.map((r) => [Number(r.name), r.n]));
  const weekly = Array.from({ length: 8 }, (_, i) => {
    const weeksAgo = 7 - i;
    return { weeksAgo, n: byWeek.get(weeksAgo) ?? 0 };
  });

  return {
    members: { approved, pending, declined, new7, new30: new30m, onboarded, alpha, admins },
    active30,
    new30: { topics: nTopics, posts: nPosts, events: nEvents, rsvps: nRsvps, briefings: nBriefings, listings: nListings, messages: nMessages, connections: nConnections },
    totals: { companies: tCompanies, topics: tTopics, posts: tPosts, events: tEvents, rsvps: tRsvps, briefings: tBriefings, connections: tConnections, messages: tMessages, jobs: tJobs, businesses: tBiz, feedbackOpen: tFeedback },
    markets,
    functions,
    seniorities,
    weekly,
  };
}
