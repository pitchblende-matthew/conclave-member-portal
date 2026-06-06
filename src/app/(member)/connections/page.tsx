import Link from "next/link";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { mediaUrl } from "@/lib/media";
import Avatar from "@/components/avatar";
import ConnectControls from "@/components/connect-controls";

export const dynamic = "force-dynamic";

type Row = { id: number; name: string; role: string; avatar_key: string; dma_name: string; company_name: string | null };

const SELECT = `SELECT u.id, u.name, u.role, u.avatar_key, u.dma_name,
                       COALESCE(c.name, NULLIF(u.company, '')) AS company_name
                FROM connections cn
                JOIN users u ON u.id = %JOIN%
                LEFT JOIN companies c ON c.id = u.company_id`;

export default async function Connections() {
  const me = await requireUser();
  const db = getDb();

  const { results: incoming } = await db
    .prepare(`${SELECT.replace("%JOIN%", "cn.requester_id")} WHERE cn.addressee_id = ? AND cn.status = 'pending' ORDER BY cn.created_at DESC`)
    .bind(me.id)
    .all<Row>();
  const { results: outgoing } = await db
    .prepare(`${SELECT.replace("%JOIN%", "cn.addressee_id")} WHERE cn.requester_id = ? AND cn.status = 'pending' ORDER BY cn.created_at DESC`)
    .bind(me.id)
    .all<Row>();
  const { results: connected } = await db
    .prepare(
      `${SELECT.replace("%JOIN%", "CASE WHEN cn.requester_id = ? THEN cn.addressee_id ELSE cn.requester_id END")}
       WHERE cn.status = 'accepted' AND (cn.requester_id = ? OR cn.addressee_id = ?)
       ORDER BY u.name COLLATE NOCASE`
    )
    .bind(me.id, me.id, me.id)
    .all<Row>();

  const Card = ({ m, state }: { m: Row; state: "incoming" | "outgoing" | "connected" }) => (
    <div className="card member-card" style={{ cursor: "default" }}>
      <div className="member-card-head" style={{ justifyContent: "space-between" }}>
        <Link href={`/directory/${m.id}`} className="member-card-head" style={{ textDecoration: "none", color: "inherit", gap: "0.85rem" }}>
          <Avatar src={m.avatar_key ? mediaUrl(m.avatar_key) : null} name={m.name} size={48} />
          <div>
            <h3 style={{ fontSize: "1.25rem", marginBottom: 0 }}>{m.name || "Member"}</h3>
            <p className="meta" style={{ margin: 0 }}>{[m.role, m.company_name].filter(Boolean).join(" · ") || "—"}</p>
          </div>
        </Link>
      </div>
      <div style={{ marginTop: "0.85rem" }}>
        <ConnectControls otherId={m.id} state={state} />
      </div>
    </div>
  );

  return (
    <>
      <div className="tag">Network</div>
      <h1 style={{ fontSize: "2.6rem" }}>Your <span className="em">connections</span></h1>

      {incoming.length > 0 && (
        <section style={{ marginTop: "1.5rem" }}>
          <h2 style={{ fontSize: "1.5rem" }}>Requests <span className="badge">{incoming.length}</span></h2>
          <div className="grid" style={{ marginTop: "0.75rem" }}>
            {incoming.map((m) => <Card key={m.id} m={m} state="incoming" />)}
          </div>
        </section>
      )}

      <section style={{ marginTop: "1.75rem" }}>
        <h2 style={{ fontSize: "1.5rem" }}>Connected {connected.length > 0 ? `· ${connected.length}` : ""}</h2>
        <div className="grid" style={{ marginTop: "0.75rem" }}>
          {connected.map((m) => <Card key={m.id} m={m} state="connected" />)}
        </div>
        {connected.length === 0 && (
          <p className="meta">No connections yet. Find people in the <Link href="/directory">member directory</Link>.</p>
        )}
      </section>

      {outgoing.length > 0 && (
        <section style={{ marginTop: "1.75rem" }}>
          <h2 style={{ fontSize: "1.5rem" }}>Pending sent</h2>
          <div className="grid" style={{ marginTop: "0.75rem" }}>
            {outgoing.map((m) => <Card key={m.id} m={m} state="outgoing" />)}
          </div>
        </section>
      )}
    </>
  );
}
