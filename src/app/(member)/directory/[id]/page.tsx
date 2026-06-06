import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { mediaUrl } from "@/lib/media";
import Avatar from "@/components/avatar";
import type { User } from "@/lib/types";

export const dynamic = "force-dynamic";

function twitterUrl(value: string): string {
  if (/^https?:\/\//i.test(value)) return value;
  return `https://x.com/${value.replace(/^@/, "")}`;
}

export default async function MemberProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await getDb()
    .prepare(
      `SELECT u.id, u.name, u.email, u.role, u.location, u.dma_name, u.bio, u.avatar_key,
              u.pronouns, u.phone, u.website, u.linkedin, u.twitter, u.company_id,
              COALESCE(c.name, NULLIF(u.company, '')) AS company_name
       FROM users u
       LEFT JOIN companies c ON c.id = u.company_id
       WHERE u.id = ?`
    )
    .bind(Number(id))
    .first<Partial<User> & { company_name: string | null }>();

  if (!member) notFound();

  const links: { label: string; href: string }[] = [];
  if (member.website) links.push({ label: "Website", href: member.website });
  if (member.linkedin) links.push({ label: "LinkedIn", href: member.linkedin });
  if (member.twitter) links.push({ label: "X / Twitter", href: twitterUrl(member.twitter) });

  return (
    <>
      <p className="meta"><Link href="/directory">← Directory</Link></p>
      <div className="card" style={{ maxWidth: 680, marginTop: "0.5rem" }}>
        <div className="profile-head">
          <Avatar src={member.avatar_key ? mediaUrl(member.avatar_key) : null} name={member.name} size={96} />
          <div>
            <h1 style={{ fontSize: "2.2rem", marginBottom: "0.15rem" }}>
              {member.name || "Member"}
              {member.pronouns ? <span className="pronouns"> · {member.pronouns}</span> : null}
            </h1>
            <p className="meta" style={{ margin: 0 }}>
              {member.role || ""}
              {member.role && member.company_name ? " · " : ""}
              {member.company_name ? (
                member.company_id ? (
                  <Link href={`/companies/${member.company_id}`}>{member.company_name}</Link>
                ) : (
                  member.company_name
                )
              ) : null}
              {!member.role && !member.company_name ? "—" : ""}
            </p>
            {member.location ? <p className="meta" style={{ margin: 0 }}>{member.location}</p> : null}
            {member.dma_name ? (
              <p style={{ margin: "0.5rem 0 0" }}><span className="market-tag">{member.dma_name}</span></p>
            ) : null}
          </div>
        </div>

        {member.bio ? <p style={{ marginTop: "1.25rem" }}>{member.bio}</p> : null}

        <dl className="detail-list">
          <dt>Email</dt>
          <dd><a href={`mailto:${member.email}`}>{member.email}</a></dd>
          {member.phone ? (
            <>
              <dt>Phone</dt>
              <dd><a href={`tel:${member.phone}`}>{member.phone}</a></dd>
            </>
          ) : null}
        </dl>

        {links.length > 0 && (
          <div className="links-row">
            {links.map((l) => (
              <a key={l.label} className="btn btn-ghost inline-btn" href={l.href} target="_blank" rel="noreferrer">
                {l.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
