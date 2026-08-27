"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import MarkdownEditor from "@/components/markdown-editor";
import { respondToRequest } from "../actions";

export default function RespondForm({ requestId, kind }: { requestId: number; kind: "ask" | "offer" }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [state, formAction, pending] = useActionState(respondToRequest, {});

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setEditorKey((k) => k + 1);
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={formAction} ref={formRef} className="card">
      <input type="hidden" name="requestId" value={requestId} />
      <label>{kind === "ask" ? "Offer help" : "Respond"}</label>
      <MarkdownEditor key={editorKey} name="body" minHeight={110} placeholder={kind === "ask" ? "I can help with this…" : "I’m interested…"} />
      {state?.error && <div className="error" role="alert">{state.error}</div>}
      <button className="btn inline-btn" type="submit" disabled={pending} style={{ marginTop: "0.75rem" }}>
        {pending ? "Posting…" : "Post response"}
      </button>
    </form>
  );
}
