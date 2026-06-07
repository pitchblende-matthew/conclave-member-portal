import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { listIndustries } from "@/lib/industries";
import { listFunctions } from "@/lib/member-taxonomy";
import SubmitBriefingForm from "./submit-briefing-form";

export const dynamic = "force-dynamic";

export default async function SubmitBriefing() {
  await requireUser();
  const { results: categories } = await getDb()
    .prepare("SELECT id, name FROM briefing_categories ORDER BY sort_order, name COLLATE NOCASE")
    .all<{ id: number; name: string }>();
  const [industries, functions] = await Promise.all([listIndustries(), listFunctions()]);
  return (
    <>
      <p className="meta"><Link href="/briefings">← Briefings</Link></p>
      <div className="tag">Submit a briefing</div>
      <h1 style={{ fontSize: "2.6rem" }}>Share a briefing</h1>
      <p className="meta" style={{ maxWidth: 560 }}>
        Pass along an essay, a link, or a short write-up. An admin reviews submissions before they&apos;re published.
      </p>
      <div className="card" style={{ maxWidth: 680, marginTop: "1.5rem" }}>
        <SubmitBriefingForm categories={categories} industries={industries} functions={functions} />
      </div>
    </>
  );
}
