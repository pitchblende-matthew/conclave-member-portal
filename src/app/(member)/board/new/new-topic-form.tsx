"use client";

import { useActionState } from "react";
import MarkdownEditor from "@/components/markdown-editor";
import { createTopic } from "../actions";

type CategoryOption = { id: number; name: string };

export default function NewTopicForm({
  categories,
  myDmaName,
}: {
  categories: CategoryOption[];
  myDmaName: string | null;
}) {
  const [state, formAction, pending] = useActionState(createTopic, {});
  return (
    <form action={formAction}>
      <label htmlFor="title">Title</label>
      <input id="title" name="title" required />
      <label htmlFor="category_id">Category</label>
      <select id="category_id" name="category_id" defaultValue={categories[0]?.id ?? ""}>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <label>Opening message</label>
      <MarkdownEditor name="body" minHeight={180} placeholder="Write your opening message…" />
      {myDmaName ? (
        <label className="check-row">
          <input type="checkbox" name="scope_area" value="1" />
          <span>Scope this topic to my area — <strong>{myDmaName}</strong></span>
        </label>
      ) : null}
      {state?.error && <div className="error">{state.error}</div>}
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "Posting…" : "Start topic"}
      </button>
    </form>
  );
}
