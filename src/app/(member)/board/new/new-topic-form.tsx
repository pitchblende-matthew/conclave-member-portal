"use client";

import { useActionState } from "react";
import { createTopic } from "../actions";

type CategoryOption = { id: number; name: string };

export default function NewTopicForm({ categories }: { categories: CategoryOption[] }) {
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
      <label htmlFor="body">Opening message</label>
      <textarea id="body" name="body" style={{ minHeight: 160 }} required />
      {state?.error && <div className="error">{state.error}</div>}
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "Posting…" : "Start topic"}
      </button>
    </form>
  );
}
