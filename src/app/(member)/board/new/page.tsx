import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import NewTopicForm from "./new-topic-form";

export const dynamic = "force-dynamic";

export default async function NewTopic() {
  const user = await requireUser();
  const { results: categories } = await getDb()
    .prepare("SELECT id, name FROM categories ORDER BY sort_order, name COLLATE NOCASE")
    .all<{ id: number; name: string }>();

  return (
    <>
      <p className="meta"><Link href="/board">← Board</Link></p>
      <div className="tag">New topic</div>
      <h1 style={{ fontSize: "2.6rem" }}>Start a discussion</h1>
      <div className="card" style={{ maxWidth: 640, marginTop: "1.5rem" }}>
        <NewTopicForm categories={categories} myDmaName={user.dma_slug ? user.dma_name : null} />
      </div>
    </>
  );
}
