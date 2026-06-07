"use client";

import { useActionState, useState } from "react";
import { createReport } from "@/app/(member)/reports/actions";

// A small "Report" control that expands into a reason field. Used on board
// content and member profiles.
export default function ReportButton({
  targetType,
  targetId,
  label = "Report",
}: {
  targetType: "topic" | "post" | "member";
  targetId: number;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createReport, {});

  if (state?.ok) return <span className="meta">Reported — thank you.</span>;

  if (!open) {
    return (
      <button type="button" className="link-danger" onClick={() => setOpen(true)}>{label}</button>
    );
  }

  return (
    <form action={action} className="report-form">
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="targetId" value={targetId} />
      <input name="reason" placeholder="What's wrong? (optional)" maxLength={500} aria-label="Report reason" />
      <div className="btn-row">
        <button className="btn btn-ghost inline-btn" type="submit" disabled={pending}>
          {pending ? "Sending…" : "Submit report"}
        </button>
        <button type="button" className="link-danger" onClick={() => setOpen(false)}>Cancel</button>
      </div>
      {state?.error && <div className="error" role="alert">{state.error}</div>}
    </form>
  );
}
