import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { mediaUrl } from "@/lib/media";
import { emailEnabled } from "@/lib/email";
import Avatar from "@/components/avatar";
import LocalTime from "@/components/local-time";
import ConfirmSubmit from "@/components/confirm-submit";
import { currentRound, getDraftView, type IntroMember } from "@/lib/intros";
import { generateIntros, unpair, pair, sendIntros } from "./actions";

export const dynamic = "force-dynamic";

const DAY = 86400000;

function monthLabel(round: string): string {
  try {
    return new Date(`${round}-01T00:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  } catch {
    return round;
  }
}

function MemberChip({ m }: { m: IntroMember }) {
  const sub = [m.role, m.company_name, m.dma_name].filter(Boolean).join(" · ");
  return (
    <Link href={`/directory/${m.id}`} className="member-card-head" style={{ textDecoration: "none", color: "inherit", flex: 1, minWidth: 0 }}>
      <Avatar src={m.avatar_key ? mediaUrl(m.avatar_key) : null} name={m.name} size={34} />
      <div style={{ minWidth: 0 }}>
        <strong>{m.name}</strong>
        {sub ? <p className="meta" style={{ margin: 0 }}>{sub}</p> : null}
      </div>
    </Link>
  );
}

export default async function AdminIntros() {
  const user = await requireUser();
  if (user.is_admin !== 1) redirect("/dashboard");

  const round = currentRound();
  const view = await getDraftView(round);
  const label = monthLabel(round);
  const isDraft = view.status === "draft";
  const isSent = view.status === "sent";
  const autoSendAt = view.created_at ? view.created_at + 3 * DAY : null;

  return (
    <>
      <p className="meta"><Link href="/admin">← Admin</Link></p>
      <div className="topline">
        <div>
          <div className="tag">Warm intros</div>
          <h1 style={{ fontSize: "2.4rem" }}>{label}</h1>
        </div>
        {isDraft && (
          <span className="market-tag">Draft</span>
        )}
        {isSent && <span className="market-tag" style={{ background: "rgba(92,113,101,0.16)", color: "#45564b" }}>Sent</span>}
      </div>

      {!emailEnabled() && (
        <p className="error" role="alert">Email isn&rsquo;t configured (RESEND_API_KEY / EMAIL_FROM), so intros can be drafted but won&rsquo;t send.</p>
      )}

      {view.status === null && (
        <div className="card" style={{ maxWidth: 560 }}>
          <p style={{ marginTop: 0 }}>No pairings drafted for {label} yet. Generate them, review, then send — or the scheduler will draft and (after a few days) auto-send on its own.</p>
          <form action={generateIntros}><button className="btn inline-btn" type="submit">Generate pairings</button></form>
        </div>
      )}

      {isSent && (
        <p className="meta">Sent {view.sent_at ? <LocalTime ms={view.sent_at} /> : null} · {view.pairs.length} intro{view.pairs.length === 1 ? "" : "s"} ({view.pairs.length * 2} emails).</p>
      )}

      {isDraft && (
        <p className="meta">
          {view.pairs.length} pair{view.pairs.length === 1 ? "" : "s"} · {view.pairs.length * 2} emails.
          {autoSendAt ? <> Auto-sends <LocalTime ms={autoSendAt} /> if not sent first.</> : null}
        </p>
      )}

      {(isDraft || isSent) && view.pairs.length > 0 && (
        <div style={{ marginTop: "1rem" }}>
          {view.pairs.map((p) => (
            <div key={`${p.a.id}-${p.b.id}`} className="card">
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                <MemberChip m={p.a} />
                <span aria-hidden style={{ color: "var(--muted)" }}>×</span>
                <MemberChip m={p.b} />
                {isDraft && (
                  <form action={unpair}>
                    <input type="hidden" name="a" value={p.a.id} />
                    <input type="hidden" name="b" value={p.b.id} />
                    <button className="btn btn-ghost inline-btn" type="submit">Unpair</button>
                  </form>
                )}
              </div>
              {p.reason ? <p className="meta" style={{ margin: "0.5rem 0 0" }}>{p.reason}</p> : null}
            </div>
          ))}
        </div>
      )}

      {isDraft && view.unpaired.length > 0 && (
        <div className="card" style={{ marginTop: "1rem" }}>
          <h3 style={{ fontSize: "1.2rem", marginTop: 0 }}>Unpaired · {view.unpaired.length}</h3>
          <p className="meta" style={{ marginTop: 0 }}>These opted-in members aren&rsquo;t matched. Pair two of them, or leave them for next month.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", margin: "0.5rem 0 1rem" }}>
            {view.unpaired.map((m) => (
              <div key={m.id} style={{ display: "flex", alignItems: "center" }}><MemberChip m={m} /></div>
            ))}
          </div>
          {view.unpaired.length >= 2 && (
            <form action={pair} className="inline-form" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
              <select name="a" defaultValue="" required>
                <option value="" disabled>Member…</option>
                {view.unpaired.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <span aria-hidden>×</span>
              <select name="b" defaultValue="" required>
                <option value="" disabled>Member…</option>
                {view.unpaired.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <button className="btn inline-btn" type="submit">Pair them</button>
            </form>
          )}
        </div>
      )}

      {isDraft && (
        <div className="btn-row" style={{ marginTop: "1.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <form action={sendIntros}>
            <ConfirmSubmit className="btn inline-btn" message={`Send ${view.pairs.length} intro${view.pairs.length === 1 ? "" : "s"} now? This emails every matched member their intro.`}>
              Send intros now
            </ConfirmSubmit>
          </form>
          <form action={generateIntros}>
            <ConfirmSubmit className="btn btn-ghost inline-btn" message="Replace the current pairings with a fresh set?">Regenerate</ConfirmSubmit>
          </form>
        </div>
      )}
    </>
  );
}
