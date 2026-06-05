"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createReply } from "../actions";

export default function ReplyForm({ topicId }: { topicId: number }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(createReply, {});

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={formAction} ref={formRef} className="card">
      <input type="hidden" name="topicId" value={topicId} />
      <label htmlFor="body">Add a reply</label>
      <textarea id="body" name="body" required />
      {state?.error && <div className="error">{state.error}</div>}
      <button className="btn inline-btn" type="submit" disabled={pending} style={{ marginTop: "0.75rem" }}>
        {pending ? "Posting…" : "Post reply"}
      </button>
    </form>
  );
}
