"use client";

import { useActionState } from "react";
import { createTopic } from "../actions";

export default function NewTopicForm() {
  const [state, formAction, pending] = useActionState(createTopic, {});
  return (
    <form action={formAction}>
      <label htmlFor="title">Title</label>
      <input id="title" name="title" required />
      <label htmlFor="body">Opening message</label>
      <textarea id="body" name="body" style={{ minHeight: 160 }} required />
      {state?.error && <div className="error">{state.error}</div>}
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "Posting…" : "Start topic"}
      </button>
    </form>
  );
}
