import { getDb } from "@/lib/db";
import type { User } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Directory() {
  const { results } = await getDb()
    .prepare("SELECT id, name, email, company, role, location, bio FROM users ORDER BY name COLLATE NOCASE")
    .all<Partial<User>>();

  return (
    <>
      <div className="tag">Member directory</div>
      <h1 style={{ fontSize: "2.6rem" }}>Who&apos;s inside</h1>
      <div className="grid" style={{ marginTop: "1.5rem" }}>
        {results.map((m) => (
          <div key={m.id} className="card">
            <h3 style={{ fontSize: "1.5rem" }}>{m.name || "Member"}</h3>
            <p className="meta">
              {[m.role, m.company].filter(Boolean).join(" · ") || "—"}
              {m.location ? <><br />{m.location}</> : null}
            </p>
            {m.bio ? <p style={{ marginTop: "0.75rem" }}>{m.bio}</p> : null}
          </div>
        ))}
        {results.length === 0 && <p className="meta">No members yet.</p>}
      </div>
    </>
  );
}
