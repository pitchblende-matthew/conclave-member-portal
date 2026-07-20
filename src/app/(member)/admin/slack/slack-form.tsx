"use client";

import { useActionState } from "react";
import { updateSlackSettings, type SlackSettingsState } from "./actions";

export default function SlackForm({
  initial,
}: {
  initial: { inviteUrl: string; workspaceName: string; teamId: string };
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
      <label htmlFor="teamId">Workspace team id (optional)</label>
      <input
        id="teamId"
        name="teamId"
        type="text"
        defaultValue={initial.teamId}
        placeholder="T0123ABCD"
        autoComplete="off"
      />
      <p className="note" style={{ marginTop: "0.35rem" }}>
        If set, &ldquo;Connect Slack&rdquo; only accepts accounts in this workspace. Find it in Slack →
        About this workspace.
      </p>
      {state?.error && <div className="error" role="alert">{state.error}</div>}
      {state?.ok && <p className="note" role="status">Saved.</p>}
      <button className="btn inline-btn" type="submit" disabled={pending} style={{ marginTop: "1rem" }}>
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
