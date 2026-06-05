import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { createInvite } from "./actions";

export const dynamic = "force-dynamic";

interface InviteRow {
  token: string;
  email: string | null;
  used_by: number | null;
  created_at: number;
}

export default async function AdminInvites() {
  const user = await requireUser();
  if (user.is_admin !== 1) redirect("/dashboard");

  const { results } = await getDb()
    .prepare("SELECT token, email, used_by, created_at FROM invites ORDER BY created_at DESC")
    .all<InviteRow>();

  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";

  return (
    <>
      <div className="tag">Admin · Invitations</div>
      <h1 style={{ fontSize: "2.6rem" }}>Invite members</h1>
      <p className="meta">Generate an invitation, then share the link. Each code works once.</p>

      <div className="card" style={{ maxWidth: 560, marginTop: "1.5rem" }}>
        <form action={createInvite}>
          <label htmlFor="email">Reserve for email (optional)</label>
          <input id="email" name="email" type="email" placeholder="name@company.com" />
          <button className="btn" type="submit">Generate invitation</button>
        </form>
      </div>

      <h2 style={{ marginTop: "2rem", fontSize: "1.6rem" }}>Issued invitations</h2>
      <div style={{ marginTop: "1rem" }}>
        {results.map((inv) => (
          <div key={inv.token} className="card">
            <div className="tag">{inv.used_by ? "Used" : "Unused"}{inv.email ? ` · ${inv.email}` : ""}</div>
            <p style={{ fontFamily: "JetBrains Mono, monospace", wordBreak: "break-all" }}>
              {`${base}/signup?invite=${inv.token}`}
            </p>
          </div>
        ))}
        {results.length === 0 && <p className="meta">No invitations issued yet.</p>}
      </div>
    </>
  );
}
