"use client";

import { useActionState } from "react";
import { sendDigestNow } from "@/app/(member)/admin/actions";

export default function DigestButton() {
  const [state, action, pending] = useActionState(sendDigestNow, {});
  return (
    <form action={action}>
      <button className="btn btn-ghost inline-btn" type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send weekly digest now"}
      </button>
      {state?.ok && <p className="note" style={{ color: "var(--sage-deep)", marginTop: "0.6rem" }}>{state.ok}</p>}
      {state?.error && <div className="error" role="alert">{state.error}</div>}
    </form>
  );
}
