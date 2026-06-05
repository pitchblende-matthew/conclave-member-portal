import Link from "next/link";
import { requireUser } from "@/lib/auth";
import NewTopicForm from "./new-topic-form";

export const dynamic = "force-dynamic";

export default async function NewTopic() {
  await requireUser();
  return (
    <>
      <p className="meta"><Link href="/board">← Board</Link></p>
      <div className="tag">New topic</div>
      <h1 style={{ fontSize: "2.6rem" }}>Start a discussion</h1>
      <div className="card" style={{ maxWidth: 640, marginTop: "1.5rem" }}>
        <NewTopicForm />
      </div>
    </>
  );
}
