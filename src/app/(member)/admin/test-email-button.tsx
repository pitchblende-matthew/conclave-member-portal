"use client";

import { useActionState } from "react";
import { sendTestEmail } from "@/app/(member)/admin/actions";

export default function TestEmailButton() {
  const [state, action, pending] = useActionState(sendTestEmail, {});
  return (
    <form action={action}>
      <button className="btn btn-ghost inline-btn" type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send test email"}
      </button>
      {state?.ok && <p className="note" style={{ color: "var(--sage-deep)", marginTop: "0.6rem" }}>{state.ok}</p>}
      {state?.error && <div className="error" role="alert">{state.error}</div>}
    </form>
  );
}
