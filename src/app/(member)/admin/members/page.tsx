import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { mediaUrl } from "@/lib/media";
import Avatar from "@/components/avatar";
import ConfirmSubmit from "@/components/confirm-submit";
import { setAdmin, setAlphaTester, removeMember } from "../actions";

export const dynamic = "force-dynamic";

type Row = {
  id: number;
  name: string;
  email: string;
  avatar_key: string;
  is_admin: number;
  alpha_tester: number;
  company_name: string | null;
};

export default async function AdminMembers() {
  const me = await requireUser();
  if (me.is_admin !== 1) redirect("/dashboard");

  const { results } = await getDb()
    .prepare(
      `SELECT u.id, u.name, u.email, u.avatar_key, u.is_admin, u.alpha_tester,
              COALESCE(c.name, NULLIF(u.company, '')) AS company_name
       FROM users u LEFT JOIN companies c ON c.id = u.company_id
       WHERE u.status = 'approved'
       ORDER BY u.name COLLATE NOCASE`
    )
    .all<Row>();

  return (
    <>
      <p className="meta"><Link href="/admin">← Admin</Link></p>
      <div className="tag">Admin · Members</div>
      <h1 style={{ fontSize: "2.6rem" }}>Manage members</h1>
      <p className="meta">{results.length} {results.length === 1 ? "member" : "members"}</p>

      <div style={{ marginTop: "1.5rem" }}>
        {results.map((m) => {
          const isSelf = m.id === me.id;
          return (
            <div key={m.id} className="card admin-row">
              <Link href={`/directory/${m.id}`} className="member-card-head" style={{ textDecoration: "none", color: "inherit" }}>
                <Avatar src={m.avatar_key ? mediaUrl(m.avatar_key) : null} name={m.name} size={44} />
                <div>
                  <h3 style={{ fontSize: "1.2rem", marginBottom: 0 }}>
                    {m.name || "Member"}
                    {m.is_admin === 1 ? <span className="badge">Admin</span> : null}
                    {m.alpha_tester === 1 ? <span className="badge">Alpha</span> : null}
                  </h3>
                  <p className="meta" style={{ margin: 0 }}>
                    {m.email}{m.company_name ? ` · ${m.company_name}` : ""}
                  </p>
                </div>
              </Link>
              <div className="btn-row">
                <Link href={`/admin/members/${m.id}/edit`} className="btn btn-ghost inline-btn">Edit details</Link>
                <form action={setAdmin}>
                  <input type="hidden" name="userId" value={m.id} />
                  <input type="hidden" name="makeAdmin" value={m.is_admin === 1 ? "0" : "1"} />
                  <button className="btn btn-ghost inline-btn" type="submit" disabled={isSelf && m.is_admin === 1}>
                    {m.is_admin === 1 ? "Revoke admin" : "Make admin"}
                  </button>
                </form>
                <form action={setAlphaTester}>
                  <input type="hidden" name="userId" value={m.id} />
                  <input type="hidden" name="makeAlpha" value={m.alpha_tester === 1 ? "0" : "1"} />
                  <button className="btn btn-ghost inline-btn" type="submit">
                    {m.alpha_tester === 1 ? "Revoke alpha" : "Make alpha tester"}
                  </button>
                </form>
                {!isSelf && (
                  <form action={removeMember}>
                    <input type="hidden" name="userId" value={m.id} />
                    <ConfirmSubmit className="btn btn-ghost inline-btn" message={`Remove ${m.name || m.email}? This can't be undone.`}>
                      Remove
                    </ConfirmSubmit>
                  </form>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
