import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import BriefingForm from "../briefing-form";

export const dynamic = "force-dynamic";

export default async function NewBriefing() {
  const user = await requireUser();
  if (user.is_admin !== 1) redirect("/dashboard");

  return (
    <>
      <p className="meta"><Link href="/admin/briefings">← Briefings</Link></p>
      <div className="tag">Admin · New briefing</div>
      <h1 style={{ fontSize: "2.6rem" }}>Create a briefing</h1>
      <div className="card" style={{ maxWidth: 680, marginTop: "1.5rem" }}>
        <BriefingForm initial={{ kind: "article", title: "", summary: "", body: "", url: "" }} />
      </div>
    </>
  );
}
