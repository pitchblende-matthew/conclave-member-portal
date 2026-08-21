import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { mediaUrl } from "@/lib/media";
import { listFunctions, listSeniorities } from "@/lib/member-taxonomy";
import { listExpertise, getUserExpertiseIds, MAX_EXPERTISE } from "@/lib/expertise";
import ProfileForm from "./form";
import SlackCard from "./slack-card";

export const dynamic = "force-dynamic";

export default async function Profile({ searchParams }: { searchParams: Promise<{ slack?: string }> }) {
  const user = await requireUser();
  const { slack: slackStatus } = await searchParams;
  const { results: companies } = await getDb()
    .prepare("SELECT id, name FROM companies ORDER BY name COLLATE NOCASE")
    .all<{ id: number; name: string }>();
  const [functions, seniorities, expertise, expertiseIds] = await Promise.all([
    listFunctions(),
    listSeniorities(),
    listExpertise(),
    getUserExpertiseIds(user.id),
  ]);
  const companyName = companies.find((c) => c.id === user.company_id)?.name ?? user.company ?? "";
  return (
    <>
      <div className="tag">Your profile</div>
      <h1 style={{ fontSize: "2.6rem" }}>Edit your details</h1>
      <p className="meta">This is what other members see in the directory.</p>
      <div className="card" style={{ maxWidth: 640, marginTop: "1.5rem" }}>
        <ProfileForm
          companies={companies}
          functions={functions}
          seniorities={seniorities}
          expertise={expertise}
          maxExpertise={MAX_EXPERTISE}
          initial={{
            name: user.name,
            companyName,
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
            avatarUrl: user.avatar_key ? mediaUrl(user.avatar_key) : null,
            coverUrl: user.cover_key ? mediaUrl(user.cover_key) : null,
          }}
        />
      </div>
      <SlackCard user={user} status={slackStatus} />
    </>
  );
}
