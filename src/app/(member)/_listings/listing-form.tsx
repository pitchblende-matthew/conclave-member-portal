"use client";

import { useActionState, useState } from "react";
import RegionFields from "@/components/region-fields";
import { KIND_META, EMPLOYMENT_TYPES, type ListingKind } from "@/lib/listings-meta";
import { createListing } from "./actions";

export default function ListingForm({ kind }: { kind: ListingKind }) {
  const meta = KIND_META[kind];
  const [remote, setRemote] = useState(false);
  const [state, formAction, pending] = useActionState(createListing, {});

  return (
    <form action={formAction}>
      <input type="hidden" name="kind" value={kind} />

      <label htmlFor="title">Title</label>
      <input id="title" name="title" required placeholder={kind === "job" ? "e.g. Head of Growth" : "e.g. Established creative agency"} />

      <div className="field-grid">
        <div>
          <label htmlFor="company">{meta.companyLabel}</label>
          <input id="company" name="company" />
        </div>
        {kind === "job" ? (
          <>
            <div>
              <label htmlFor="employment_type">Employment type</label>
              <select id="employment_type" name="employment_type" defaultValue="">
                <option value="">—</option>
                {EMPLOYMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="compensation">Compensation</label>
              <input id="compensation" name="compensation" placeholder="e.g. $120k–150k" />
            </div>
          </>
        ) : (
          <>
            <div>
              <label htmlFor="asking_price">Asking price (USD)</label>
              <input id="asking_price" name="asking_price" type="number" min={0} placeholder="0 = undisclosed" />
            </div>
            <div>
              <label htmlFor="annual_revenue">Annual revenue (USD)</label>
              <input id="annual_revenue" name="annual_revenue" type="number" min={0} placeholder="optional" />
            </div>
          </>
        )}
      </div>

      <label className="check-row">
        <input type="checkbox" name="is_remote" value="1" checked={remote} onChange={(e) => setRemote(e.target.checked)} />
        <span>{meta.remoteLabel}</span>
      </label>
      {!remote && <div className="field-grid"><RegionFields /></div>}

      <label htmlFor="description">Description</label>
      <textarea id="description" name="description" />

      <div className="field-grid">
        <div>
          <label htmlFor="apply_url">{meta.applyLabel}</label>
          <input id="apply_url" name="apply_url" type="url" placeholder="https://" />
        </div>
        <div>
          <label htmlFor="contact_email">Contact email</label>
          <input id="contact_email" name="contact_email" type="email" placeholder="optional" />
        </div>
      </div>

      {state?.error && <div className="error" role="alert">{state.error}</div>}
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "Posting…" : meta.postCta}
      </button>
    </form>
  );
}
