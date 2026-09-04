import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "./db";
import { emailEnabled, emailIntro, emailIntroFollowup, siteUrl } from "./email";
import { notifyAdmins } from "./notifications";

// Warm intros — a monthly 1:1 pairing of members, admin-curated then emailed.
//
// Flow: the runner drafts pairings for the month and notifies admins; an admin
// reviews/edits and sends from /admin/intros. If no one acts within
// AUTO_SEND_AFTER, the runner sends the draft on a later tick so intros never
// silently stop. Everything is keyed by the YYYY-MM round and idempotent.

const DAY = 86400000;
const AUTO_SEND_AFTER = 3 * DAY; // grace period for admins to review before auto-send
const FOLLOWUP_AFTER = 7 * DAY; // wait after send before nudging pairs to connect

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

// One-click "we met" token, scoped to a specific pair + member.
export async function metToken(pairId: number, userId: number): Promise<string> {
  return (await sha256hex(`${pairId}.${userId}.conclave-met.${digestSecret()}`)).slice(0, 24);
}

async function metUrl(pairId: number, userId: number): Promise<string> {
  return siteUrl(`/api/intros/met?p=${pairId}&u=${userId}&t=${await metToken(pairId, userId)}`);
}

// Mark a pair as met, if the given member actually belongs to it. Idempotent —
// the first marker sticks. Returns whether the pair is (now) marked met.
export async function markMet(pairId: number, userId: number): Promise<boolean> {
  if (!pairId || !userId) return false;
  const db = getDb();
  const row = await db.prepare("SELECT user_a, user_b, met_at FROM intro_pairs WHERE id=?").bind(pairId).first<{ user_a: number; user_b: number; met_at: number | null }>();
  if (!row || (row.user_a !== userId && row.user_b !== userId)) return false;
  if (row.met_at) return true;
  await db.prepare("UPDATE intro_pairs SET met_at=?, met_by=? WHERE id=? AND met_at IS NULL").bind(Date.now(), userId, pairId).run();
  return true;
}

export async function applyMetToken(pairId: number, userId: number, token: string): Promise<boolean> {
  if (!pairId || !userId || !token) return false;
  if (token !== (await metToken(pairId, userId))) return false;
  return await markMet(pairId, userId);
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

// A week after a round is sent, nudge each paired member to actually connect.
// Runs over any sent round that hasn't been followed up yet; keyed by
// intro_rounds.followed_up_at so it fires once per round. Opt-outs are honored.
export async function sendFollowups(): Promise<{ rounds: number; emailed: number; errors: string[] }> {
  const out = { rounds: 0, emailed: 0, errors: [] as string[] };
  if (!emailEnabled()) return out;
  const db = getDb();
  const cutoff = Date.now() - FOLLOWUP_AFTER;
  const { results: due } = await db
    .prepare("SELECT round FROM intro_rounds WHERE status='sent' AND followed_up_at IS NULL AND sent_at IS NOT NULL AND sent_at <= ? ORDER BY round ASC")
    .bind(cutoff)
    .all<{ round: string }>();

  for (const { round } of due) {
    const { results: rows } = await db
      .prepare(
        `SELECT p.id, p.met_at,
                a.id AS a_id, a.email AS a_email, a.name AS a_name, a.role AS a_role, a.dma_name AS a_dma, a.bio AS a_bio, a.intro_opt_out AS a_opt, ca.name AS a_company,
                b.id AS b_id, b.email AS b_email, b.name AS b_name, b.role AS b_role, b.dma_name AS b_dma, b.bio AS b_bio, b.intro_opt_out AS b_opt, cb.name AS b_company
         FROM intro_pairs p
         JOIN users a ON a.id = p.user_a
         JOIN users b ON b.id = p.user_b
         LEFT JOIN companies ca ON ca.id = a.company_id
         LEFT JOIN companies cb ON cb.id = b.company_id
         WHERE p.round = ?`
      )
      .bind(round)
      .all<{
        id: number; met_at: number | null;
        a_id: number; a_email: string; a_name: string; a_role: string; a_dma: string; a_bio: string; a_opt: number; a_company: string | null;
        b_id: number; b_email: string; b_name: string; b_role: string; b_dma: string; b_bio: string; b_opt: number; b_company: string | null;
      }>();

    for (const r of rows) {
      if (r.met_at) continue; // they already connected — no nudge needed
      const sides = [
        { to: r.a_email, name: r.a_name, self: r.a_id, opt: r.a_opt, partner: { id: r.b_id, name: r.b_name, role: r.b_role, company: r.b_company, dma_name: r.b_dma, bio: r.b_bio } },
        { to: r.b_email, name: r.b_name, self: r.b_id, opt: r.b_opt, partner: { id: r.a_id, name: r.a_name, role: r.a_role, company: r.a_company, dma_name: r.a_dma, bio: r.a_bio } },
      ];
      for (const side of sides) {
        if (side.opt || !side.to) continue;
        try {
          await emailIntroFollowup(side.to, side.name, side.partner, round, await metUrl(r.id, side.self), await introUnsubUrl(side.self));
          out.emailed += 1;
        } catch (e) {
          out.errors.push(`followup pair ${r.id} → ${side.self}: ${String(e)}`);
        }
      }
    }
    await db.prepare("UPDATE intro_rounds SET followed_up_at=? WHERE round=?").bind(Date.now(), round).run();
    out.rounds += 1;
  }
  return out;
}

export type IntroResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  round?: string;
  drafted?: number;
  emailed?: number;
  followedUp?: number;
  errors: string[];
};

// Scheduled orchestration (runs daily): draft a new month's pairings and notify
// admins; auto-send a draft past the grace period; and nudge sent rounds a week
// on. Follow-ups run on every tick regardless of the current round's state.
export async function runIntros(): Promise<IntroResult> {
  const errors: string[] = [];
  if (!emailEnabled()) return { ok: false, skipped: true, reason: "Email isn't configured.", errors };

  const followups = await sendFollowups();
  errors.push(...followups.errors);
  const followUp = { followedUp: followups.emailed };

  const round = currentRound();
  const s = await getRoundStatus(round);

  if (s?.status === "sent") return { ok: errors.length === 0, skipped: true, reason: `Intros already sent for ${round}.`, round, ...followUp, errors };

  if (!s) {
    const drafted = await generateDraft(round);
    await notifyAdmins("intros_ready");
    return { ok: errors.length === 0, round, drafted, reason: "Draft created; admins notified to review.", ...followUp, errors };
  }

  // status is draft — auto-send once past the grace window.
  if (Date.now() - s.created_at >= AUTO_SEND_AFTER) {
    const res = await sendRound(round);
    errors.push(...res.errors);
    return { ok: errors.length === 0, round, emailed: res.emailed, ...followUp, errors };
  }
  return { ok: errors.length === 0, skipped: true, reason: "Draft awaiting admin review.", round, ...followUp, errors };
}

// The member-facing card: this member's most recent *sent* intro, if any.
export type MyIntro = { round: string; pairId: number; met: boolean; iMarkedMet: boolean; partner: IntroMember };

export async function myLatestIntro(userId: number): Promise<MyIntro | null> {
  const db = getDb();
  const row = await db
    .prepare(
      `SELECT p.id AS pair_id, p.round, p.met_at, p.met_by,
              CASE WHEN p.user_a = ?1 THEN p.user_b ELSE p.user_a END AS partner_id
       FROM intro_pairs p
       JOIN intro_rounds r ON r.round = p.round
       WHERE r.status = 'sent' AND (p.user_a = ?1 OR p.user_b = ?1)
       ORDER BY r.sent_at DESC, p.round DESC LIMIT 1`
    )
    .bind(userId)
    .first<{ pair_id: number; round: string; met_at: number | null; met_by: number | null; partner_id: number }>();
  if (!row) return null;
  const partner = await db
    .prepare(
      `SELECT u.id, u.email, u.name, u.role, u.bio, u.dma_slug, u.dma_name, u.function_id, u.avatar_key,
              COALESCE(c.name, NULLIF(u.company,'')) AS company_name
       FROM users u LEFT JOIN companies c ON c.id = u.company_id WHERE u.id = ?`
    )
    .bind(row.partner_id)
    .first<IntroMember>();
  if (!partner) return null;
  return { round: row.round, pairId: row.pair_id, met: !!row.met_at, iMarkedMet: row.met_by === userId, partner };
}

// Admin round history: every round, newest first, with its pairs and met status.
export type HistoryMember = { id: number; name: string; avatar_key: string | null };
export type HistoryRound = {
  round: string;
  status: "draft" | "sent";
  created_at: number;
  sent_at: number | null;
  followed_up_at: number | null;
  pairs: { a: HistoryMember; b: HistoryMember; met: boolean }[];
  metCount: number;
};

export async function introHistory(limit = 24): Promise<HistoryRound[]> {
  const db = getDb();
  const { results: rounds } = await db
    .prepare("SELECT round, status, created_at, sent_at, followed_up_at FROM intro_rounds ORDER BY round DESC LIMIT ?")
    .bind(limit)
    .all<{ round: string; status: "draft" | "sent"; created_at: number; sent_at: number | null; followed_up_at: number | null }>();
  if (rounds.length === 0) return [];
  const ph = rounds.map(() => "?").join(",");
  const { results: pairs } = await db
    .prepare(
      `SELECT p.round, p.met_at,
              a.id AS a_id, a.name AS a_name, a.avatar_key AS a_avatar,
              b.id AS b_id, b.name AS b_name, b.avatar_key AS b_avatar
       FROM intro_pairs p
       JOIN users a ON a.id = p.user_a
       JOIN users b ON b.id = p.user_b
       WHERE p.round IN (${ph}) ORDER BY p.id ASC`
    )
    .bind(...rounds.map((r) => r.round))
    .all<{ round: string; met_at: number | null; a_id: number; a_name: string; a_avatar: string | null; b_id: number; b_name: string; b_avatar: string | null }>();
  const byRound = new Map<string, HistoryRound["pairs"]>();
  const metByRound = new Map<string, number>();
  for (const p of pairs) {
    const list = byRound.get(p.round) ?? [];
    list.push({ a: { id: p.a_id, name: p.a_name, avatar_key: p.a_avatar }, b: { id: p.b_id, name: p.b_name, avatar_key: p.b_avatar }, met: !!p.met_at });
    byRound.set(p.round, list);
    if (p.met_at) metByRound.set(p.round, (metByRound.get(p.round) ?? 0) + 1);
  }
  return rounds.map((r) => ({ ...r, pairs: byRound.get(r.round) ?? [], metCount: metByRound.get(r.round) ?? 0 }));
}
