"use client";

import { useActionState, useState } from "react";
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
  isVirtual: boolean;
  meetingUrl: string;
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
  const [virtual, setVirtual] = useState(initial.isVirtual);
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
          <input id="location" name="location" defaultValue={initial.location} placeholder={virtual ? "e.g. Zoom, Online" : "e.g. The Foundry"} />
        </div>
        <div>
          <label htmlFor="capacity">Capacity (0 = unlimited)</label>
          <input id="capacity" name="capacity" type="number" min={0} defaultValue={initial.capacity} />
        </div>
      </div>

      <label className="check-row">
        <input type="checkbox" name="is_virtual" value="1" checked={virtual} onChange={(e) => setVirtual(e.target.checked)} />
        <span>Virtual event — online and network-wide (no media market)</span>
      </label>

      {virtual ? (
        <>
          <label htmlFor="meeting_url">Join link</label>
          <input id="meeting_url" name="meeting_url" type="url" defaultValue={initial.meetingUrl} placeholder="https://… — shown to members who RSVP" />
        </>
      ) : (
        <>
          <input type="hidden" name="meeting_url" value={initial.meetingUrl} />
          <div className="field-grid">
            <RegionFields city={initial.city} state={initial.state} zip={initial.zip} />
          </div>
          <p className="note" style={{ marginTop: "-0.25rem" }}>
            City / State / ZIP set the event&apos;s media market for the &quot;near me&quot; filter. Leave blank for network-wide.
          </p>
        </>
      )}

      <label htmlFor="description">Description</label>
      <textarea id="description" name="description" defaultValue={initial.description} />

      {state?.ok && <div className="note">Saved.</div>}
      {state?.error && <div className="error" role="alert">{state.error}</div>}
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "Saving…" : isEdit ? "Save changes" : "Create event"}
      </button>
    </form>
  );
}
