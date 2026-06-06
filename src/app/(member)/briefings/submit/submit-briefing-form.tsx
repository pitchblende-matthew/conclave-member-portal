"use client";

import { useActionState, useState } from "react";
import { submitBriefing } from "../actions";

export default function SubmitBriefingForm() {
  const [kind, setKind] = useState("article");
  const [state, formAction, pending] = useActionState(submitBriefing, {});

  if (state?.ok) {
    return (
      <div>
        <p>Thanks — your briefing has been sent to the admins for review. You&apos;ll get a notification once it&apos;s published.</p>
        <p className="note">An admin may add a cover image before it goes live.</p>
      </div>
    );
  }

  return (
    <form action={formAction}>
      <label htmlFor="kind">Type</label>
      <select id="kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value)}>
        <option value="article">Article — written in the portal</option>
        <option value="link">Link — points to an external page</option>
      </select>

      <label htmlFor="title">Title</label>
      <input id="title" name="title" required />

      <label htmlFor="summary">Summary</label>
      <textarea id="summary" name="summary" style={{ minHeight: 70 }} placeholder="One or two lines shown in the list" />

      {kind === "link" ? (
        <>
          <label htmlFor="url">Link URL</label>
          <input id="url" name="url" type="url" placeholder="https://" required />
        </>
      ) : (
        <>
          <label htmlFor="body">Body</label>
          <textarea id="body" name="body" style={{ minHeight: 240 }} placeholder="Write the briefing. Blank lines separate paragraphs." />
        </>
      )}

      {state?.error && <div className="error">{state.error}</div>}
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "Submitting…" : "Submit for review"}
      </button>
    </form>
  );
}
