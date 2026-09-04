import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { mediaUrl } from "@/lib/media";
import Avatar from "@/components/avatar";
import LocalTime from "@/components/local-time";
import { introHistory, type HistoryMember } from "@/lib/intros";

export const dynamic = "force-dynamic";

function monthLabel(round: string): string {
  try {
    return new Date(`${round}-01T00:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  } catch {
    return round;
  }
}

function Person({ m }: { m: HistoryMember }) {
  return (
    <Link href={`/directory/${m.id}`} style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", textDecoration: "none", color: "inherit", minWidth: 0 }}>
      <Avatar src={m.avatar_key ? mediaUrl(m.avatar_key) : null} name={m.name} size={24} />
      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</span>
    </Link>
  );
}

export default async function AdminIntroHistory() {
  const user = await requireUser();
  if (user.is_admin !== 1) redirect("/dashboard");

  const rounds = await introHistory(24);

  return (
    <>
      <p className="meta"><Link href="/admin/intros">← Warm intros</Link></p>
      <div className="tag">Warm intros</div>
      <h1 style={{ fontSize: "2.4rem" }}>Round history</h1>
      <p className="meta">Every monthly round — who was paired, when it sent, and how many pairs met.</p>

      {rounds.length === 0 && <p className="meta" style={{ marginTop: "1.5rem" }}>No rounds yet.</p>}

      <div style={{ marginTop: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        {rounds.map((r) => (
          <div key={r.round} className="card">
            <div className="topline" style={{ alignItems: "baseline", flexWrap: "wrap", gap: "0.5rem" }}>
              <h2 style={{ fontSize: "1.5rem", margin: 0 }}>{monthLabel(r.round)}</h2>
              {r.status === "sent" ? (
                <span className="market-tag" style={{ background: "rgba(92,113,101,0.16)", color: "#45564b" }}>Sent</span>
              ) : (
                <span className="market-tag">Draft</span>
              )}
            </div>
            <p className="meta" style={{ margin: "0.35rem 0 0" }}>
              {r.pairs.length} pair{r.pairs.length === 1 ? "" : "s"} · {r.metCount} met
              {r.status === "sent" && r.sent_at ? <> · sent <LocalTime ms={r.sent_at} /></> : null}
              {r.followed_up_at ? <> · followed up <LocalTime ms={r.followed_up_at} /></> : null}
            </p>
            {r.pairs.length > 0 && (
              <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {r.pairs.map((p, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", fontSize: "0.95rem" }}>
                    <Person m={p.a} />
                    <span aria-hidden style={{ color: "var(--muted)" }}>×</span>
                    <Person m={p.b} />
                    {p.met && <span className="meta" title="Marked as connected" style={{ color: "#45564b" }}>· connected ✓</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
