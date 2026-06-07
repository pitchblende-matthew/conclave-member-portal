"use client";

import { useActionState, useState } from "react";
import MarkdownEditor from "@/components/markdown-editor";
import TagPicker from "@/components/tag-picker";
import type { Industry } from "@/lib/industries";
import type { Taxon } from "@/lib/member-taxonomy";
import { submitBriefing } from "../actions";

type CategoryOption = { id: number; name: string };

export default function SubmitBriefingForm({ categories, industries, functions }: { categories: CategoryOption[]; industries: Industry[]; functions: Taxon[] }) {
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
          <select id="category_id" name="category_id" defaultValue="">
            <option value="">Uncategorized</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

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
          <label>Body</label>
          <MarkdownEditor name="body" minHeight={240} placeholder="Write the briefing…" />
        </>
      )}

      <TagPicker industries={industries} functions={functions} />
      {state?.error && <div className="error" role="alert">{state.error}</div>}
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "Submitting…" : "Submit for review"}
      </button>
    </form>
  );
}
