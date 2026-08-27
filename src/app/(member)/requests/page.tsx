import Link from "next/link";
import Eyebrow from "@/components/eyebrow";
import Avatar from "@/components/avatar";
import LocalTime from "@/components/local-time";
import EmptyState from "@/components/empty-state";
import { mediaUrl } from "@/lib/media";
import { requireUser } from "@/lib/auth";
import { listRequests, REQUEST_CATEGORIES, categoryLabel, type RequestKind } from "@/lib/requests";

export const dynamic = "force-dynamic";

function kindBadge(kind: string) {
  const ask = kind === "ask";
  return (
    <span
      className="market-tag"
      style={ask ? { background: "rgba(178,106,76,0.14)", color: "#985838" } : { background: "rgba(92,113,101,0.16)", color: "#45564b" }}
    >
      {ask ? "Ask" : "Offer"}
    </span>
  );
}

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; category?: string }>;
}) {
  await requireUser();
  const { kind, category } = await searchParams;
  const activeKind: RequestKind | null = kind === "ask" || kind === "offer" ? kind : null;
  const activeCat = REQUEST_CATEGORIES.find((c) => c.slug === category)?.slug ?? null;

  const rows = await listRequests({ kind: activeKind, category: activeCat });

  const href = (over: { kind?: string | null; category?: string | null }) => {
    const sp = new URLSearchParams();
    const k = over.kind === undefined ? activeKind : over.kind;
    const c = over.category === undefined ? activeCat : over.category;
    if (k) sp.set("kind", k);
    if (c) sp.set("category", c);
    const s = sp.toString();
    return s ? `/requests?${s}` : "/requests";
  };

  return (
    <>
      <div className="topline">
        <div>
          <Eyebrow icon="connections">Asks &amp; Offers</Eyebrow>
          <h1 style={{ fontSize: "2.6rem" }}>What the room <span className="em">needs</span> &amp; <span className="em">gives</span></h1>
        </div>
        <Link href="/requests/new" className="btn inline-btn">Post an ask or offer</Link>
      </div>
      <p className="meta">Need an intro, a vendor, advice, or a hire? Or have help to give? Post it — the network answers.</p>

      <nav className="chip-row" style={{ marginTop: "1.25rem" }}>
        <Link href={href({ kind: null })} className={`chip${!activeKind ? " chip-active" : ""}`}>All</Link>
        <Link href={href({ kind: "ask" })} className={`chip${activeKind === "ask" ? " chip-active" : ""}`}>Asks</Link>
        <Link href={href({ kind: "offer" })} className={`chip${activeKind === "offer" ? " chip-active" : ""}`}>Offers</Link>
      </nav>
      <nav className="chip-row" style={{ marginTop: "0.6rem" }} aria-label="Filter by category">
        <Link href={href({ category: null })} className={`chip${!activeCat ? " chip-active" : ""}`}>Any topic</Link>
        {REQUEST_CATEGORIES.map((c) => (
          <Link key={c.slug} href={href({ category: c.slug })} className={`chip${activeCat === c.slug ? " chip-active" : ""}`}>{c.label}</Link>
        ))}
      </nav>

      <div style={{ marginTop: "1.5rem" }}>
        {rows.map((r) => (
          <Link key={r.id} href={`/requests/${r.id}`} className="card" style={{ display: "block", textDecoration: "none", color: "inherit" }}>
            <span style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
              {kindBadge(r.kind)}
              <span className="chip chip-static">{categoryLabel(r.category)}</span>
              {r.status !== "open" ? <span className="market-tag">Resolved</span> : null}
            </span>
            <h3 style={{ fontSize: "1.5rem", margin: "0.5rem 0 0.35rem" }}>{r.title}</h3>
            {r.body ? <p style={{ margin: "0 0 0.6rem", color: "var(--muted)" }}>{r.body.length > 160 ? `${r.body.slice(0, 160)}…` : r.body}</p> : null}
            <p className="meta" style={{ display: "flex", alignItems: "center", gap: "0.5rem", margin: 0 }}>
              <Avatar src={r.avatar_key ? mediaUrl(r.avatar_key) : null} name={r.author ?? ""} size={22} />
              {r.author || "Member"} · <LocalTime ms={r.created_at} /> · {r.responses} response{r.responses === 1 ? "" : "s"}
            </p>
          </Link>
        ))}
        {rows.length === 0 && (
          <EmptyState title={activeKind || activeCat ? "Nothing here yet" : "No asks or offers yet"}>
            <Link href="/requests/new">Be the first to post →</Link>
          </EmptyState>
        )}
      </div>
    </>
  );
}
