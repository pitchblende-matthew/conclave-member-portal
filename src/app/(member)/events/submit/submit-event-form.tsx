"use client";

import { useActionState, useState } from "react";
import RegionFields from "@/components/region-fields";
import TagPicker from "@/components/tag-picker";
import type { Industry } from "@/lib/industries";
import type { Taxon } from "@/lib/member-taxonomy";
import { submitEvent } from "../actions";

export default function SubmitEventForm({ industries, functions }: { industries: Industry[]; functions: Taxon[] }) {
  const [virtual, setVirtual] = useState(false);
  const [state, formAction, pending] = useActionState(submitEvent, {});

  if (state?.ok) {
    return (
      <div>
        <p>Thanks — your event has been sent to the admins for review. You&apos;ll get a notification once it&apos;s approved.</p>
        <p className="note">It will appear on the Events page once approved.</p>
      </div>
    );
  }

  return (
    <form action={formAction}>
      <label htmlFor="title">Title</label>
      <input id="title" name="title" required />

      <div className="field-grid">
        <div>
          <label htmlFor="starts_at">Date &amp; time (UTC)</label>
          <input id="starts_at" name="starts_at" type="datetime-local" required />
        </div>
        <div>
          <label htmlFor="location">Venue / location</label>
          <input id="location" name="location" placeholder={virtual ? "e.g. Zoom, Online" : "e.g. The Foundry"} />
        </div>
        <div>
          <label htmlFor="capacity">Capacity (0 = unlimited)</label>
          <input id="capacity" name="capacity" type="number" min={0} defaultValue={0} />
        </div>
      </div>

      <label className="check-row">
        <input type="checkbox" name="is_virtual" value="1" checked={virtual} onChange={(e) => setVirtual(e.target.checked)} />
        <span>Virtual event — online and network-wide</span>
      </label>

      {virtual ? (
        <>
          <label htmlFor="meeting_url">Join link</label>
          <input id="meeting_url" name="meeting_url" type="url" placeholder="https://… — shown to members who RSVP" />
        </>
      ) : (
        <div className="field-grid">
          <RegionFields />
        </div>
      )}

      <label htmlFor="description">Description</label>
      <textarea id="description" name="description" />

      <TagPicker industries={industries} functions={functions} />
      {state?.error && <div className="error" role="alert">{state.error}</div>}
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "Submitting…" : "Submit for review"}
      </button>
    </form>
  );
}
