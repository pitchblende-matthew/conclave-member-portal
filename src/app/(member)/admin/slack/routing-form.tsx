"use client";

import { useActionState } from "react";
import { updateBridgeRouting, type SlackSettingsState } from "./actions";

type Category = { key: string; label: string; hint: string };

export default function RoutingForm({
  categories,
  routing,
}: {
  categories: readonly Category[];
  routing: Record<string, { on: boolean; url: string }>;
}) {
  const [state, formAction, pending] = useActionState<SlackSettingsState, FormData>(
    updateBridgeRouting,
    {}
  );
  return (
    <form action={formAction}>
      {categories.map((c) => {
        const r = routing[c.key] ?? { on: true, url: "" };
        return (
          <div key={c.key} style={{ padding: "0.75rem 0", borderBottom: "1px solid var(--border, #e7ded0)" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 500 }}>
              <input type="checkbox" name={`${c.key}_on`} value="1" defaultChecked={r.on} style={{ width: "auto" }} />
              {c.label}
            </label>
            <p className="note" style={{ margin: "0.15rem 0 0.4rem 1.6rem" }}>{c.hint}</p>
            <input
              type="text"
              name={`${c.key}_url`}
              defaultValue={r.url}
              placeholder="#channel or webhook override (optional) — defaults to the main destination"
              autoComplete="off"
              style={{ marginLeft: "1.6rem", width: "calc(100% - 1.6rem)" }}
            />
          </div>
        );
      })}
      {state?.error && <div className="error" role="alert" style={{ marginTop: "0.75rem" }}>{state.error}</div>}
      {state?.ok && <p className="note" role="status" style={{ marginTop: "0.75rem" }}>Saved.</p>}
      <button className="btn inline-btn" type="submit" disabled={pending} style={{ marginTop: "1rem" }}>
        {pending ? "Saving…" : "Save routing"}
      </button>
    </form>
  );
}
