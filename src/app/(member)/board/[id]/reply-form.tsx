"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import MarkdownEditor from "@/components/markdown-editor";
import { createReply } from "../actions";

export default function ReplyForm({ topicId }: { topicId: number }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [state, formAction, pending] = useActionState(createReply, {});

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setEditorKey((k) => k + 1); // remount the editor to clear it
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={formAction} ref={formRef} className="card">
      <input type="hidden" name="topicId" value={topicId} />
      <label>Add a reply</label>
      <MarkdownEditor key={editorKey} name="body" minHeight={120} placeholder="Write a reply…" />
      {state?.error && <div className="error">{state.error}</div>}
      <button className="btn inline-btn" type="submit" disabled={pending} style={{ marginTop: "0.75rem" }}>
        {pending ? "Posting…" : "Post reply"}
      </button>
    </form>
  );
}
