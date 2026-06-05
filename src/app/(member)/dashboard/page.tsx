import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const user = await getSessionUser();
  const db = getDb();
  const members = await db
    .prepare("SELECT COUNT(*) AS n FROM users WHERE status = 'approved'")
    .first<{ n: number }>();
  const upcoming = await db
    .prepare("SELECT COUNT(*) AS n FROM events WHERE starts_at > ?")
    .bind(Date.now())
    .first<{ n: number }>();

  return (
    <>
      <div className="tag">Member dashboard</div>
      <h1 style={{ fontSize: "2.6rem" }}>
        Welcome{user?.name ? <>, <span className="em">{user.name}</span></> : ""}.
      </h1>
      <p className="meta" style={{ maxWidth: 560 }}>
        A small, deliberately curated room for owners and operators. Here&apos;s where things stand.
      </p>
      <div className="grid" style={{ marginTop: "2rem" }}>
        <div className="card">
          <div className="tag">Members</div>
          <h2 style={{ fontSize: "2.4rem" }}>{members?.n ?? 0}</h2>
          <p className="meta">people in the network</p>
        </div>
        <div className="card">
          <div className="tag">Upcoming</div>
          <h2 style={{ fontSize: "2.4rem" }}>{upcoming?.n ?? 0}</h2>
          <p className="meta">events on the calendar</p>
        </div>
      </div>
    </>
  );
}
