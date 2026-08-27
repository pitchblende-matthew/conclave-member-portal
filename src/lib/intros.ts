import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "./db";
import { emailEnabled, emailIntro, siteUrl } from "./email";

// Warm intros — a monthly 1:1 pairing of members, delivered by email. The
// matcher avoids recent repeats and prefers same-market pairs (so they can meet
// in person); the whole thing is idempotent per round. Env-gated on email.

function digestSecret(): string {
  try {
    const { env } = getCloudflareContext() as unknown as { env: { DIGEST_SECRET?: string } };
    return env?.DIGEST_SECRET || "";
  } catch {
    return "";
  }
}

async function sha256hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function introUnsubToken(userId: number): Promise<string> {
  return (await sha256hex(`${userId}.conclave-intros.${digestSecret()}`)).slice(0, 24);
}

async function introUnsubUrl(userId: number): Promise<string> {
  return siteUrl(`/api/intros/unsubscribe?u=${userId}&t=${await introUnsubToken(userId)}`);
}

export async function applyIntroUnsubscribe(userId: number, token: string): Promise<boolean> {
  if (!userId || !token) return false;
  if (token !== (await introUnsubToken(userId))) return false;
  await getDb().prepare("UPDATE users SET intro_opt_out=1 WHERE id=?").bind(userId).run();
  return true;
}

type Member = {
  id: number;
  email: string;
  name: string;
  role: string;
  bio: string;
  dma_slug: string;
  dma_name: string;
  function_id: number;
  company_name: string | null;
};

// 'YYYY-MM' in Eastern time — the intro round key.
function roundKey(now: Date): string {
  return now.toLocaleDateString("en-CA", { timeZone: "America/New_York" }).slice(0, 7);
}

function pairKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

function introReason(a: Member, b: Member): string | undefined {
  if (a.dma_slug && a.dma_slug === b.dma_slug && a.dma_name) return `You're both in ${a.dma_name}`;
  if (a.function_id && a.function_id === b.function_id) return "You work in the same function";
  return undefined;
}

export type IntroResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  round?: string;
  paired: number;
  emailed: number;
  errors: string[];
};

export async function runIntros({ force = false }: { force?: boolean } = {}): Promise<IntroResult> {
  const result: IntroResult = { ok: true, paired: 0, emailed: 0, errors: [] };
  if (!emailEnabled()) return { ...result, ok: false, skipped: true, reason: "Email isn't configured (set RESEND_API_KEY and EMAIL_FROM)." };

  const db = getDb();
  const round = roundKey(new Date());
  result.round = round;

  const already = await db.prepare("SELECT 1 FROM intro_pairs WHERE round = ? LIMIT 1").bind(round).first();
  if (already) {
    if (!force) return { ...result, skipped: true, reason: `Intros already sent for ${round}.` };
    await db.prepare("DELETE FROM intro_pairs WHERE round = ?").bind(round).run(); // clean re-run
  }

  const { results: members } = await db
    .prepare(
      `SELECT u.id, u.email, u.name, u.role, u.bio, u.dma_slug, u.dma_name, u.function_id,
              COALESCE(c.name, NULLIF(u.company, '')) AS company_name
       FROM users u LEFT JOIN companies c ON c.id = u.company_id
       WHERE u.status='approved' AND u.onboarded=1 AND u.intro_opt_out=0 AND u.email != '' AND u.name != ''`
    )
    .all<Member>();

  if (members.length < 2) return { ...result, skipped: true, reason: "Not enough opted-in members to make intros." };

  // Avoid pairs from recent rounds.
  const { results: recent } = await db.prepare("SELECT user_a, user_b FROM intro_pairs ORDER BY id DESC LIMIT 500").all<{ user_a: number; user_b: number }>();
  const recentSet = new Set(recent.map((p) => `${p.user_a}-${p.user_b}`));

  // Shuffle for fairness (portal runtime has Math.random).
  const pool = [...members];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  // Greedy pairing: skip recent repeats, prefer a same-market partner.
  const used = new Set<number>();
  const groups: Member[][] = [];
  for (const m of pool) {
    if (used.has(m.id)) continue;
    let cands = pool.filter((x) => x.id !== m.id && !used.has(x.id) && !recentSet.has(pairKey(m.id, x.id)));
    if (cands.length === 0) cands = pool.filter((x) => x.id !== m.id && !used.has(x.id));
    if (cands.length === 0) continue;
    const sameMarket = cands.find((x) => x.dma_slug && x.dma_slug === m.dma_slug);
    const partner = sameMarket ?? cands[0];
    used.add(m.id);
    used.add(partner.id);
    groups.push([m, partner]);
  }
  // Odd one out joins the first pair, making a single trio, so no one is left out.
  const leftover = pool.filter((x) => !used.has(x.id));
  if (leftover.length === 1 && groups.length > 0) {
    groups[0].push(leftover[0]);
    used.add(leftover[0].id);
  }

  const now = Date.now();
  for (const g of groups) {
    try {
      for (let i = 0; i < g.length; i++) {
        for (let j = i + 1; j < g.length; j++) {
          const a = Math.min(g[i].id, g[j].id);
          const b = Math.max(g[i].id, g[j].id);
          await db.prepare("INSERT INTO intro_pairs (round, user_a, user_b, created_at) VALUES (?, ?, ?, ?)").bind(round, a, b, now).run();
          result.paired += 1;
        }
      }
    } catch (e) {
      result.errors.push(`round ${round} store: ${String(e)}`);
    }
    for (const m of g) {
      const partners = g
        .filter((x) => x.id !== m.id)
        .map((x) => ({ id: x.id, name: x.name, role: x.role, company: x.company_name, dma_name: x.dma_name, bio: x.bio, reason: introReason(m, x) }));
      try {
        await emailIntro(m.email, m.name, partners, round, await introUnsubUrl(m.id));
        result.emailed += 1;
      } catch (e) {
        result.errors.push(`intro ${m.id}: ${String(e)}`);
      }
    }
  }

  result.ok = result.errors.length === 0;
  return result;
}
