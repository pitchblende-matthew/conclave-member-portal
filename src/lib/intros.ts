import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "./db";
import { emailEnabled, emailIntro, siteUrl } from "./email";
import { notifyAdmins } from "./notifications";

// Warm intros — a monthly 1:1 pairing of members, admin-curated then emailed.
//
// Flow: the runner drafts pairings for the month and notifies admins; an admin
// reviews/edits and sends from /admin/intros. If no one acts within
// AUTO_SEND_AFTER, the runner sends the draft on a later tick so intros never
// silently stop. Everything is keyed by the YYYY-MM round and idempotent.

const DAY = 86400000;
const AUTO_SEND_AFTER = 3 * DAY; // grace period for admins to review before auto-send

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

export type IntroMember = {
  id: number;
  email: string;
  name: string;
  role: string;
  bio: string;
  dma_slug: string;
  dma_name: string;
  function_id: number;
  company_name: string | null;
  avatar_key: string | null;
};

// 'YYYY-MM' in Eastern time — the intro round key.
export function currentRound(now: Date = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "America/New_York" }).slice(0, 7);
}

function pairKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

export function introReason(a: { dma_slug: string; dma_name: string; function_id: number }, b: { dma_slug: string; function_id: number }): string | undefined {
  if (a.dma_slug && a.dma_slug === b.dma_slug && a.dma_name) return `You're both in ${a.dma_name}`;
  if (a.function_id && a.function_id === b.function_id) return "You work in the same function";
  return undefined;
}

async function eligibleMembers(): Promise<IntroMember[]> {
  const { results } = await getDb()
    .prepare(
      `SELECT u.id, u.email, u.name, u.role, u.bio, u.dma_slug, u.dma_name, u.function_id, u.avatar_key,
              COALESCE(c.name, NULLIF(u.company, '')) AS company_name
       FROM users u LEFT JOIN companies c ON c.id = u.company_id
       WHERE u.status='approved' AND u.onboarded=1 AND u.intro_opt_out=0 AND u.email != '' AND u.name != ''`
    )
    .all<IntroMember>();
  return results;
}

export async function getRoundStatus(round: string): Promise<{ status: "draft" | "sent"; created_at: number; sent_at: number | null } | null> {
  return await getDb().prepare("SELECT status, created_at, sent_at FROM intro_rounds WHERE round=?").bind(round).first<{ status: "draft" | "sent"; created_at: number; sent_at: number | null }>();
}

// Build (or rebuild) the draft pairings for a round: match eligible members,
// avoiding pairs from other rounds and preferring same-market partners. The odd
// member out is left unpaired for an admin to place. Only allowed while the
// round is unsent.
export async function generateDraft(round: string): Promise<number> {
  const db = getDb();
  const existing = await getRoundStatus(round);
  if (existing?.status === "sent") return 0;

  const members = await eligibleMembers();
  const { results: recent } = await db.prepare("SELECT user_a, user_b FROM intro_pairs WHERE round != ? ORDER BY id DESC LIMIT 500").bind(round).all<{ user_a: number; user_b: number }>();
  const recentSet = new Set(recent.map((p) => `${p.user_a}-${p.user_b}`));

  const pool = [...members];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const used = new Set<number>();
  const pairs: [number, number][] = [];
  for (const m of pool) {
    if (used.has(m.id)) continue;
    let cands = pool.filter((x) => x.id !== m.id && !used.has(x.id) && !recentSet.has(pairKey(m.id, x.id)));
    if (cands.length === 0) cands = pool.filter((x) => x.id !== m.id && !used.has(x.id));
    if (cands.length === 0) continue;
    const partner = cands.find((x) => x.dma_slug && x.dma_slug === m.dma_slug) ?? cands[0];
    used.add(m.id);
    used.add(partner.id);
    pairs.push([Math.min(m.id, partner.id), Math.max(m.id, partner.id)]);
  }

  const now = Date.now();
  await db.prepare("DELETE FROM intro_pairs WHERE round=?").bind(round).run();
  for (const [a, b] of pairs) {
    await db.prepare("INSERT INTO intro_pairs (round, user_a, user_b, created_at) VALUES (?, ?, ?, ?)").bind(round, a, b, now).run();
  }
  await db
    .prepare("INSERT INTO intro_rounds (round, status, created_at, sent_at) VALUES (?, 'draft', ?, NULL) ON CONFLICT(round) DO UPDATE SET status='draft', created_at=excluded.created_at, sent_at=NULL")
    .bind(round, now)
    .run();
  return pairs.length;
}

export type DraftView = {
  status: "draft" | "sent" | null;
  created_at: number | null;
  sent_at: number | null;
  pairs: { a: IntroMember; b: IntroMember; reason?: string }[];
  unpaired: IntroMember[];
};

export async function getDraftView(round: string): Promise<DraftView> {
  const db = getDb();
  const status = await getRoundStatus(round);
  const { results: rows } = await db.prepare("SELECT user_a, user_b FROM intro_pairs WHERE round=? ORDER BY id ASC").bind(round).all<{ user_a: number; user_b: number }>();
  const members = await eligibleMembers();
  const byId = new Map(members.map((m) => [m.id, m]));
  // Members can be paired even if they've since become ineligible; fetch any missing.
  const missing = new Set<number>();
  for (const r of rows) { if (!byId.has(r.user_a)) missing.add(r.user_a); if (!byId.has(r.user_b)) missing.add(r.user_b); }
  if (missing.size) {
    const ph = [...missing].map(() => "?").join(",");
    const { results } = await db
      .prepare(`SELECT u.id, u.email, u.name, u.role, u.bio, u.dma_slug, u.dma_name, u.function_id, u.avatar_key, COALESCE(c.name, NULLIF(u.company,'')) AS company_name FROM users u LEFT JOIN companies c ON c.id=u.company_id WHERE u.id IN (${ph})`)
      .bind(...missing)
      .all<IntroMember>();
    for (const m of results) byId.set(m.id, m);
  }
  const pairs: DraftView["pairs"] = [];
  const pairedIds = new Set<number>();
  for (const r of rows) {
    const a = byId.get(r.user_a);
    const b = byId.get(r.user_b);
    if (!a || !b) continue;
    pairedIds.add(a.id);
    pairedIds.add(b.id);
    pairs.push({ a, b, reason: introReason(a, b) });
  }
  const unpaired = members.filter((m) => !pairedIds.has(m.id));
  return { status: status?.status ?? null, created_at: status?.created_at ?? null, sent_at: status?.sent_at ?? null, pairs, unpaired };
}

async function ensureDraft(round: string): Promise<boolean> {
  const s = await getRoundStatus(round);
  return s?.status === "draft";
}

export async function removeDraftPair(round: string, a: number, b: number): Promise<void> {
  if (!(await ensureDraft(round))) return;
  const lo = Math.min(a, b), hi = Math.max(a, b);
  await getDb().prepare("DELETE FROM intro_pairs WHERE round=? AND user_a=? AND user_b=?").bind(round, lo, hi).run();
}

export async function addDraftPair(round: string, a: number, b: number): Promise<void> {
  if (!a || !b || a === b) return;
  if (!(await ensureDraft(round))) return;
  const db = getDb();
  // Both must currently be unpaired in this round.
  const busy = await db.prepare("SELECT 1 FROM intro_pairs WHERE round=? AND (user_a IN (?,?) OR user_b IN (?,?)) LIMIT 1").bind(round, a, b, a, b).first();
  if (busy) return;
  await db.prepare("INSERT INTO intro_pairs (round, user_a, user_b, created_at) VALUES (?, ?, ?, ?)").bind(round, Math.min(a, b), Math.max(a, b), Date.now()).run();
}

// Send every draft pair's intro emails and mark the round sent. No-op if already
// sent or email isn't configured.
export async function sendRound(round: string): Promise<{ emailed: number; errors: string[] }> {
  const result = { emailed: 0, errors: [] as string[] };
  if (!emailEnabled()) return result;
  const db = getDb();
  const s = await getRoundStatus(round);
  if (!s || s.status === "sent") return result;

  const view = await getDraftView(round);
  for (const p of view.pairs) {
    for (const [m, other] of [[p.a, p.b], [p.b, p.a]] as [IntroMember, IntroMember][]) {
      try {
        await emailIntro(
          m.email,
          m.name,
          [{ id: other.id, name: other.name, role: other.role, company: other.company_name, dma_name: other.dma_name, bio: other.bio, reason: introReason(m, other) }],
          round,
          await introUnsubUrl(m.id)
        );
        result.emailed += 1;
      } catch (e) {
        result.errors.push(`intro ${m.id}: ${String(e)}`);
      }
    }
  }
  await db.prepare("UPDATE intro_rounds SET status='sent', sent_at=? WHERE round=?").bind(Date.now(), round).run();
  return result;
}

export type IntroResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  round?: string;
  drafted?: number;
  emailed?: number;
  errors: string[];
};

// Scheduled orchestration (runs daily): draft a new month's pairings and notify
// admins; auto-send a draft that's been sitting past the grace period.
export async function runIntros(): Promise<IntroResult> {
  const errors: string[] = [];
  if (!emailEnabled()) return { ok: false, skipped: true, reason: "Email isn't configured.", errors };
  const round = currentRound();
  const s = await getRoundStatus(round);

  if (s?.status === "sent") return { ok: true, skipped: true, reason: `Intros already sent for ${round}.`, round, errors };

  if (!s) {
    const drafted = await generateDraft(round);
    await notifyAdmins("intros_ready");
    return { ok: true, round, drafted, reason: "Draft created; admins notified to review.", errors };
  }

  // status is draft — auto-send once past the grace window.
  if (Date.now() - s.created_at >= AUTO_SEND_AFTER) {
    const res = await sendRound(round);
    return { ok: res.errors.length === 0, round, emailed: res.emailed, errors: res.errors };
  }
  return { ok: true, skipped: true, reason: "Draft awaiting admin review.", round, errors };
}
