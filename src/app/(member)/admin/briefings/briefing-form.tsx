"use client";

import { useActionState, useState } from "react";
import MarkdownEditor from "@/components/markdown-editor";
import { createBriefing, updateBriefing } from "./actions";

type Initial = {
  id?: number;
  kind: string;
  title: string;
  summary: string;
  body: string;
  url: string;
  categoryId: number;
};

type CategoryOption = { id: number; name: string };

export default function BriefingForm({ initial, categories }: { initial: Initial; categories: CategoryOption[] }) {
  const isEdit = typeof initial.id === "number";
  const [kind, setKind] = useState(initial.kind === "link" ? "link" : "article");
  const [state, formAction, pending] = useActionState(isEdit ? updateBriefing : createBriefing, {});

  return (
    <form action={formAction}>
      {isEdit && <input type="hidden" name="briefingId" value={initial.id} />}

      <div className="field-grid">
        <div>
          <label htmlFor="kind">Type</label>
          <select id="kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="article">Article — written in the portal</option>
            <option value="link">Link — points to an external page</option>
          </select>
        </div>
        <div>
          <label htmlFor="category_id">Category</label>
          <select id="category_id" name="category_id" defaultValue={initial.categoryId || ""}>
            <option value="">Uncategorized</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

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
          <label>Body</label>
          <MarkdownEditor name="body" defaultValue={initial.body} minHeight={260} placeholder="Write the briefing…" />
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
