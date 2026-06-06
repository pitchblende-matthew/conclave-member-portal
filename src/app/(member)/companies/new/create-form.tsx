"use client";

import { useActionState } from "react";
import RegionFields from "@/components/region-fields";
import { createCompany } from "../actions";

export default function CreateCompanyForm() {
  const [state, formAction, pending] = useActionState(createCompany, {});
  return (
    <form action={formAction}>
      <label htmlFor="name">Company name</label>
      <input id="name" name="name" required />

      <div className="field-grid">
        <div>
          <label htmlFor="industry">Industry</label>
          <input id="industry" name="industry" />
        </div>
        <div>
          <label htmlFor="size">Size</label>
          <input id="size" name="size" placeholder="e.g. 11–50" />
        </div>
        <div>
          <label htmlFor="website">Website</label>
          <input id="website" name="website" type="url" placeholder="https://" />
        </div>
        <RegionFields />
      </div>
      <p className="note" style={{ marginTop: "-0.25rem" }}>
        Adding a ZIP places the company in its media market so members nearby can find it.
      </p>

      <label htmlFor="description">Description</label>
      <textarea id="description" name="description" />

      {state?.error && <div className="error">{state.error}</div>}
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create company"}
      </button>
      <p className="note">You can add a logo after creating the company.</p>
    </form>
  );
}
