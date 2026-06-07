"use client";

import { useRef, useState } from "react";
import { renderMarkdown } from "@/lib/markdown";

// Lightweight Markdown editor: a formatting toolbar over a textarea, plus a
// live preview. Stores Markdown (the textarea named `name` submits normally).
export default function MarkdownEditor({
  name,
  defaultValue = "",
  minHeight = 200,
  placeholder,
}: {
  name: string;
  defaultValue?: string;
  minHeight?: number;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [tab, setTab] = useState<"write" | "preview">("write");

  // Wrap the current selection with `before`/`after` markers.
  const wrap = (before: string, after = before, placeholderText = "text") => {
    const ta = ref.current;
    if (!ta) return;
    const s = ta.selectionStart;
    const e = ta.selectionEnd;
    const sel = value.slice(s, e) || placeholderText;
    const next = value.slice(0, s) + before + sel + after + value.slice(e);
    setValue(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = s + before.length;
      ta.selectionEnd = s + before.length + sel.length;
    });
  };

  // Prefix each selected line (used for headings, lists, quotes).
  const prefixLines = (prefix: string) => {
    const ta = ref.current;
    if (!ta) return;
    const s = ta.selectionStart;
    const e = ta.selectionEnd;
    const lineStart = value.lastIndexOf("\n", s - 1) + 1;
    const block = value.slice(lineStart, e);
    const replaced = block
      .split("\n")
      .map((l) => (l.length ? prefix + l : prefix + "text"))
      .join("\n");
    const next = value.slice(0, lineStart) + replaced + value.slice(e);
    setValue(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = lineStart;
      ta.selectionEnd = lineStart + replaced.length;
    });
  };

  return (
    <div className="md-editor">
      <div className="md-toolbar" role="toolbar" aria-label="Text formatting">
        <button type="button" className="md-btn" title="Bold" aria-label="Bold" onClick={() => wrap("**")}><b aria-hidden>B</b></button>
        <button type="button" className="md-btn" title="Italic" aria-label="Italic" onClick={() => wrap("_")}><i aria-hidden>I</i></button>
        <button type="button" className="md-btn" title="Heading" aria-label="Heading" onClick={() => prefixLines("### ")}>H</button>
        <button type="button" className="md-btn" title="Bulleted list" aria-label="Bulleted list" onClick={() => prefixLines("- ")}><span aria-hidden>&bull;</span></button>
        <button type="button" className="md-btn" title="Numbered list" aria-label="Numbered list" onClick={() => prefixLines("1. ")}>1.</button>
        <button type="button" className="md-btn" title="Quote" aria-label="Quote" onClick={() => prefixLines("> ")}><span aria-hidden>&ldquo;</span></button>
        <button type="button" className="md-btn" title="Link" aria-label="Insert link" onClick={() => wrap("[", "](https://)", "label")}>Link</button>
        <span className="md-spacer" />
        <button type="button" className={`md-tab${tab === "write" ? " active" : ""}`} aria-pressed={tab === "write"} onClick={() => setTab("write")}>Write</button>
        <button type="button" className={`md-tab${tab === "preview" ? " active" : ""}`} aria-pressed={tab === "preview"} onClick={() => setTab("preview")}>Preview</button>
      </div>

      <textarea
        ref={ref}
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder || "Markdown text"}
        style={{ minHeight, display: tab === "write" ? "block" : "none" }}
      />
      {tab === "preview" && (
        <div
          className="md-preview prose"
          style={{ minHeight }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(value) || "<p class=\"meta\">Nothing to preview yet.</p>" }}
        />
      )}

      <p className="note" style={{ marginTop: "0.35rem" }}>
        Markdown supported — **bold**, _italic_, ### headings, - lists, &gt; quotes, [links](url).
      </p>
    </div>
  );
}
