import Link from "next/link";
import { requireUser } from "@/lib/auth";
import SubmitEventForm from "./submit-event-form";

export const dynamic = "force-dynamic";

export default async function SubmitEvent() {
  await requireUser();
  return (
    <>
      <p className="meta"><Link href="/events">← Events</Link></p>
      <div className="tag">Submit an event</div>
      <h1 style={{ fontSize: "2.6rem" }}>Propose an event</h1>
      <p className="meta" style={{ maxWidth: 560 }}>
        Share something the network should know about. An admin reviews submissions before they go on the calendar.
      </p>
      <div className="card" style={{ maxWidth: 640, marginTop: "1.5rem" }}>
        <SubmitEventForm />
      </div>
    </>
  );
}
