import Link from "next/link";
import { getDb } from "@/lib/db";
import { mediaUrl } from "@/lib/media";
import Avatar from "@/components/avatar";
import type { User } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Directory() {
  const { results } = await getDb()
    .prepare(
      `SELECT u.id, u.name, u.role, u.location, u.bio, u.avatar_key, u.pronouns,
              COALESCE(c.name, NULLIF(u.company, '')) AS company_name
       FROM users u
       LEFT JOIN companies c ON c.id = u.company_id
       WHERE u.status = 'approved'
       ORDER BY u.name COLLATE NOCASE`
    )
    .all<Partial<User> & { company_name: string | null }>();

  return (
    <>
      <div className="tag">Member directory</div>
      <h1 style={{ fontSize: "2.6rem" }}>Who&apos;s <span className="em">inside</span></h1>
      <div className="grid" style={{ marginTop: "1.5rem" }}>
        {results.map((m) => (
          <Link key={m.id} href={`/directory/${m.id}`} className="card member-card">
            <div className="member-card-head">
              <Avatar src={m.avatar_key ? mediaUrl(m.avatar_key) : null} name={m.name} size={56} />
              <div>
                <h3 style={{ fontSize: "1.4rem", marginBottom: 0 }}>
                  {m.name || "Member"}
                  {m.pronouns ? <span className="pronouns"> · {m.pronouns}</span> : null}
                </h3>
                <p className="meta" style={{ margin: 0 }}>
                  {[m.role, m.company_name].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
            </div>
            {m.location ? <p className="meta" style={{ marginTop: "0.75rem" }}>{m.location}</p> : null}
            {m.bio ? <p className="member-card-bio">{m.bio}</p> : null}
          </Link>
        ))}
        {results.length === 0 && <p className="meta">No members yet.</p>}
      </div>
    </>
  );
}
