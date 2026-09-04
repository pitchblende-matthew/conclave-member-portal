import { redirect } from "next/navigation";
import { mountPath } from "@/lib/base-path";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { mediaUrl } from "@/lib/media";
import { listFunctions, listSeniorities } from "@/lib/member-taxonomy";
import { listExpertise, getUserExpertiseIds, MAX_EXPERTISE } from "@/lib/expertise";
import ProfileForm from "@/app/(member)/profile/form";
import Wordmark from "@/components/wordmark";

export const dynamic = "force-dynamic";

export default async function Onboarding() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.status !== "approved") redirect("/pending");
  if (user.onboarded === 1) redirect("/dashboard");

  const { results: companies } = await getDb()
    .prepare("SELECT id, name FROM companies ORDER BY name COLLATE NOCASE")
    .all<{ id: number; name: string }>();
  const [functions, seniorities, expertise, expertiseIds] = await Promise.all([
    listFunctions(),
    listSeniorities(),
    listExpertise(),
    getUserExpertiseIds(user.id),
  ]);

  const base = mountPath();
  // Match the portal theme (defaults to dark), rendered server-side to avoid a flash.
  const theme = (await cookies()).get("theme")?.value === "light" ? "light" : "dark";

  return (
    <div id="app-shell" className={theme === "dark" ? "app-dark" : "app-light"}>
      <main className="page" style={{ maxWidth: 680, margin: "0 auto", padding: "3rem 1.5rem 4rem" }}>
      <div style={{ marginBottom: "1rem" }}><Wordmark size={1.6} /></div>
      <div className="eyebrow">Welcome</div>
      <h1 style={{ fontSize: "2.6rem" }}>Complete your profile</h1>
      <p className="meta" style={{ maxWidth: 560 }}>
        You&apos;re approved. Add a photo and a few details so the rest of the network knows who you are.
        This is what members see in the directory.
      </p>
      <div className="card" style={{ marginTop: "1.5rem" }}>
        <ProfileForm
          companies={companies}
          functions={functions}
          seniorities={seniorities}
          expertise={expertise}
          maxExpertise={MAX_EXPERTISE}
          mode="onboarding"
          initial={{
            name: user.name,
            companyName: user.company,
            role: user.role,
            function_id: user.function_id,
            seniority_id: user.seniority_id,
            expertiseIds,
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
            discoverRegionOnly: user.discover_region_only === 1,
            discoverPeersOnly: user.discover_peers_only === 1,
            digestOptIn: user.digest_opt_out !== 1,
            eventOptIn: user.event_opt_out !== 1,
            introOptIn: user.intro_opt_out !== 1,
            avatarUrl: user.avatar_key ? mediaUrl(user.avatar_key) : null,
            coverUrl: user.cover_key ? mediaUrl(user.cover_key) : null,
          }}
        />
      </div>
      <p className="note" style={{ marginTop: "1rem" }}>
        <a href={`${base}/logout`}>Sign out</a>
      </p>
      </main>
    </div>
  );
}
