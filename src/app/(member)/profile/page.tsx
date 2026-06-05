import { requireUser } from "@/lib/auth";
import ProfileForm from "./form";

export const dynamic = "force-dynamic";

export default async function Profile() {
  const user = await requireUser();
  return (
    <>
      <div className="tag">Your profile</div>
      <h1 style={{ fontSize: "2.6rem" }}>Edit your details</h1>
      <p className="meta">This is what other members see in the directory.</p>
      <div className="card" style={{ maxWidth: 560, marginTop: "1.5rem" }}>
        <ProfileForm
          initial={{
            name: user.name,
            company: user.company,
            role: user.role,
            location: user.location,
            bio: user.bio,
            email: user.email,
          }}
        />
      </div>
    </>
  );
}
