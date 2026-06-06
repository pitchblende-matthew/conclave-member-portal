"use client";

import { useActionState } from "react";
import RegionFields from "@/components/region-fields";
import { createEvent, updateEvent } from "./actions";

type Initial = {
  id?: number;
  title: string;
  description: string;
  location: string;
  city: string;
  state: string;
  zip: string;
  startsAtMs: number | null;
  capacity: number;
};

// ms -> "YYYY-MM-DDTHH:mm" in UTC (matches the server's parse on save).
function toInputValue(ms: number | null): string {
  if (ms === null) return "";
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

export default function EventForm({ initial }: { initial: Initial }) {
  const isEdit = typeof initial.id === "number";
  const [state, formAction, pending] = useActionState(isEdit ? updateEvent : createEvent, {});

  return (
    <form action={formAction}>
      {isEdit && <input type="hidden" name="eventId" value={initial.id} />}
      <label htmlFor="title">Title</label>
      <input id="title" name="title" defaultValue={initial.title} required />

      <div className="field-grid">
        <div>
          <label htmlFor="starts_at">Date &amp; time (UTC)</label>
          <input id="starts_at" name="starts_at" type="datetime-local" defaultValue={toInputValue(initial.startsAtMs)} required />
        </div>
        <div>
          <label htmlFor="location">Venue / location</label>
          <input id="location" name="location" defaultValue={initial.location} placeholder="e.g. The Foundry, or Online" />
        </div>
        <div>
          <label htmlFor="capacity">Capacity (0 = unlimited)</label>
          <input id="capacity" name="capacity" type="number" min={0} defaultValue={initial.capacity} />
        </div>
        <RegionFields city={initial.city} state={initial.state} zip={initial.zip} />
      </div>
      <p className="note" style={{ marginTop: "-0.25rem" }}>
        City / State / ZIP set the event&apos;s media market for the &quot;near me&quot; filter. Leave blank for network-wide events.
      </p>

      <label htmlFor="description">Description</label>
      <textarea id="description" name="description" defaultValue={initial.description} />

      {state?.ok && <div className="note">Saved.</div>}
      {state?.error && <div className="error">{state.error}</div>}
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "Saving…" : isEdit ? "Save changes" : "Create event"}
      </button>
    </form>
  );
}
