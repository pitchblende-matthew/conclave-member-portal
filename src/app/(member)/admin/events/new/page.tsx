import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { listIndustries } from "@/lib/industries";
import { listFunctions } from "@/lib/member-taxonomy";
import EventForm from "../event-form";

export const dynamic = "force-dynamic";

export default async function NewEvent() {
  const user = await requireUser();
  if (user.is_admin !== 1) redirect("/dashboard");
  const [industries, functions] = await Promise.all([listIndustries(), listFunctions()]);

  return (
    <>
      <p className="meta"><Link href="/admin/events">← Events</Link></p>
      <div className="tag">Admin · New event</div>
      <h1 style={{ fontSize: "2.6rem" }}>Create an event</h1>
      <div className="card" style={{ maxWidth: 640, marginTop: "1.5rem" }}>
        <EventForm industries={industries} functions={functions} initial={{ title: "", description: "", location: "", city: "", state: "", zip: "", isVirtual: false, meetingUrl: "", startsAtMs: null, capacity: 0 }} />
      </div>
    </>
  );
}
