"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { sendMessage } from "../actions";

export default function MessageComposer({ otherId }: { otherId: number }) {
  const ref = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [state, action, pending] = useActionState(sendMessage, {});

  useEffect(() => {
    if (state?.ok) {
      ref.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={action} ref={ref} className="msg-composer card">
      <input type="hidden" name="otherId" value={otherId} />
      <textarea name="body" placeholder="Write a message…" rows={2} required />
      {state?.error && <div className="error">{state.error}</div>}
      <button className="btn inline-btn" type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send"}
      </button>
    </form>
  );
}
