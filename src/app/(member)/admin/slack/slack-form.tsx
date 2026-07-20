"use client";

import { useActionState } from "react";
import { updateSlackSettings, type SlackSettingsState } from "./actions";

export default function SlackForm({
  initial,
}: {
  initial: { inviteUrl: string; workspaceName: string };
}) {
  const [state, formAction, pending] = useActionState<SlackSettingsState, FormData>(
    updateSlackSettings,
    {}
  );
  return (
    <form action={formAction}>
      <label htmlFor="inviteUrl">Shared invite link</label>
      <input
        id="inviteUrl"
        name="inviteUrl"
        type="url"
        defaultValue={initial.inviteUrl}
        placeholder="https://join.slack.com/t/…"
        autoComplete="off"
      />
      <label htmlFor="workspaceName">Workspace name (shown to members)</label>
      <input
        id="workspaceName"
        name="workspaceName"
        type="text"
        defaultValue={initial.workspaceName}
        placeholder="the Conclave Slack"
        autoComplete="off"
      />
      {state?.error && <div className="error" role="alert">{state.error}</div>}
      {state?.ok && <p className="note" role="status">Saved.</p>}
      <button className="btn inline-btn" type="submit" disabled={pending} style={{ marginTop: "1rem" }}>
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
