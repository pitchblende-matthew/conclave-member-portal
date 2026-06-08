"use client";

import { useActionState, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Icon from "@/components/icons";
import { submitFeedback } from "./actions";

// Floating reporter shown only to alpha testers. Captures the current page so
// admins know exactly where a bug/feature note came from.
export default function FeedbackWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"bug" | "feature">("bug");
  const [state, action, pending] = useActionState(submitFeedback, {});

  // Close the panel a moment after a successful send.
  useEffect(() => {
    if (state?.ok) {
      const t = setTimeout(() => setOpen(false), 1600);
      return () => clearTimeout(t);
    }
  }, [state?.ok]);

  return (
    <div className="fab-wrap">
      {open && (
        <div className="fab-panel" role="dialog" aria-label="Send feedback">
          <div className="fab-head">
            <span>Alpha feedback</span>
            <button type="button" className="fab-x" aria-label="Close" onClick={() => setOpen(false)}>✕</button>
          </div>
          {state?.ok ? (
            <p className="note" style={{ margin: "0.4rem 0 0.2rem", color: "var(--sage-deep)" }}>
              Thanks — sent to the team.
            </p>
          ) : (
            <form action={action}>
              <input type="hidden" name="page" value={pathname} />
              <input type="hidden" name="kind" value={kind} />
              <div className="fab-seg">
                <button type="button" className={`fab-seg-btn${kind === "bug" ? " on" : ""}`} onClick={() => setKind("bug")}>Bug</button>
                <button type="button" className={`fab-seg-btn${kind === "feature" ? " on" : ""}`} onClick={() => setKind("feature")}>Feature</button>
              </div>
              <textarea
                name="body"
                required
                rows={4}
                placeholder={kind === "bug" ? "What went wrong, and what did you expect?" : "What would you like to see?"}
                style={{ marginTop: "0.6rem" }}
              />
              <label className="fab-shot">
                <span>Screenshot <span className="fab-optional">(optional)</span></span>
                <input type="file" name="screenshot" accept="image/png,image/jpeg,image/webp" />
              </label>
              <p className="fab-page">On <code>{pathname}</code></p>
              {state?.error && <div className="error" role="alert">{state.error}</div>}
              <button className="btn inline-btn" type="submit" disabled={pending} style={{ width: "100%", marginTop: "0.7rem" }}>
                {pending ? "Sending…" : "Send"}
              </button>
            </form>
          )}
        </div>
      )}
      <button
        type="button"
        className="fab"
        aria-expanded={open}
        aria-label={open ? "Close feedback" : "Send feedback"}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="sparkle" size={16} />
        <span>Feedback</span>
      </button>
    </div>
  );
}
