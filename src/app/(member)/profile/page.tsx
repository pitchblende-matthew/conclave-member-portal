import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { mediaUrl } from "@/lib/media";
import ProfileForm from "./form";

export const dynamic = "force-dynamic";

export default async function Profile() {
  const user = await requireUser();
  const { results: companies } = await getDb()
    .prepare("SELECT id, name FROM companies ORDER BY name COLLATE NOCASE")
    .all<{ id: number; name: string }>();
  const companyName = companies.find((c) => c.id === user.company_id)?.name ?? user.company ?? "";
  return (
    <>
      <div className="tag">Your profile</div>
      <h1 style={{ fontSize: "2.6rem" }}>Edit your details</h1>
      <p className="meta">This is what other members see in the directory.</p>
      <div className="card" style={{ maxWidth: 640, marginTop: "1.5rem" }}>
        <ProfileForm
          companies={companies}
          initial={{
            name: user.name,
            companyName,
            role: user.role,
            city: user.city,
            state: user.state,
            zip: user.zip,
            pronouns: user.pronouns,
            phone: user.phone,
            website: user.website,
            linkedin: user.linkedin,
            twitter: user.twitter,
            bio: user.bio,
            email: user.email,
            avatarUrl: user.avatar_key ? mediaUrl(user.avatar_key) : null,
          }}
        />
      </div>
    </>
  );
}
