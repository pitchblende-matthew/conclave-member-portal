"use client";

import { useActionState, useState } from "react";
import MarkdownEditor from "@/components/markdown-editor";
import { REQUEST_CATEGORIES } from "@/lib/requests";
import { createRequest } from "../actions";

export default function NewRequestForm({ defaultKind }: { defaultKind: "ask" | "offer" }) {
  const [kind, setKind] = useState<"ask" | "offer">(defaultKind);
  const [state, formAction, pending] = useActionState(createRequest, {});

  return (
    <form action={formAction}>
      <input type="hidden" name="kind" value={kind} />
      <div className="chip-row" role="group" aria-label="Post type" style={{ marginBottom: "1.1rem" }}>
        <button type="button" className={`chip${kind === "ask" ? " chip-active" : ""}`} aria-pressed={kind === "ask"} onClick={() => setKind("ask")}>
          I need something — Ask
        </button>
        <button type="button" className={`chip${kind === "offer" ? " chip-active" : ""}`} aria-pressed={kind === "offer"} onClick={() => setKind("offer")}>
          I can help — Offer
        </button>
      </div>

      <label htmlFor="title">{kind === "ask" ? "What do you need?" : "What can you help with?"}</label>
      <input
        id="title"
        name="title"
        required
        placeholder={kind === "ask" ? "e.g. Intro to a fractional CFO who knows SaaS" : "e.g. Happy to review anyone’s paid-search account"}
      />

      <label htmlFor="category">Topic</label>
      <select id="category" name="category" defaultValue="other">
        {REQUEST_CATEGORIES.map((c) => (
          <option key={c.slug} value={c.slug}>{c.label}</option>
        ))}
      </select>

      <label>Details <span className="meta">(optional)</span></label>
      <MarkdownEditor name="body" minHeight={160} placeholder="Add context so members can help…" />

      {state?.error && <div className="error" role="alert">{state.error}</div>}
      <button className="btn" type="submit" disabled={pending}>{pending ? "Posting…" : "Post"}</button>
    </form>
  );
}
