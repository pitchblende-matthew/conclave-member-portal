"use client";

import { useActionState, useState } from "react";
import { createBriefing, updateBriefing } from "./actions";

type Initial = {
  id?: number;
  kind: string;
  title: string;
  summary: string;
  body: string;
  url: string;
};

export default function BriefingForm({ initial }: { initial: Initial }) {
  const isEdit = typeof initial.id === "number";
  const [kind, setKind] = useState(initial.kind === "link" ? "link" : "article");
  const [state, formAction, pending] = useActionState(isEdit ? updateBriefing : createBriefing, {});

  return (
    <form action={formAction}>
      {isEdit && <input type="hidden" name="briefingId" value={initial.id} />}

      <label htmlFor="kind">Type</label>
      <select id="kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value)}>
        <option value="article">Article — written in the portal</option>
        <option value="link">Link — points to an external page</option>
      </select>

      <label htmlFor="title">Title</label>
      <input id="title" name="title" defaultValue={initial.title} required />

      <label htmlFor="summary">Summary</label>
      <textarea id="summary" name="summary" defaultValue={initial.summary} style={{ minHeight: 70 }} placeholder="One or two lines shown in the list" />

      {kind === "link" ? (
        <>
          <label htmlFor="url">Link URL</label>
          <input id="url" name="url" type="url" defaultValue={initial.url} placeholder="https://" required />
          {/* Keep any existing body around so switching back to Article doesn't lose it. */}
          <input type="hidden" name="body" value={initial.body} />
        </>
      ) : (
        <>
          <label htmlFor="body">Body</label>
          <textarea id="body" name="body" defaultValue={initial.body} style={{ minHeight: 260 }} placeholder="Write the briefing. Blank lines separate paragraphs." />
          <input type="hidden" name="url" value={initial.url} />
        </>
      )}

      {state?.ok && <div className="note">Saved.</div>}
      {state?.error && <div className="error">{state.error}</div>}
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "Saving…" : isEdit ? "Save changes" : "Create draft"}
      </button>
      {!isEdit && <p className="note">You can add a cover image and publish after creating the draft.</p>}
    </form>
  );
}
