import { requireUser } from "@/lib/auth";
import { mediaUrl } from "@/lib/media";
import ProfileForm from "./form";

export const dynamic = "force-dynamic";

export default async function Profile() {
  const user = await requireUser();
  return (
    <>
      <div className="tag">Your profile</div>
      <h1 style={{ fontSize: "2.6rem" }}>Edit your details</h1>
      <p className="meta">This is what other members see in the directory.</p>
      <div className="card" style={{ maxWidth: 640, marginTop: "1.5rem" }}>
        <ProfileForm
          initial={{
            name: user.name,
            company: user.company,
            role: user.role,
            location: user.location,
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
