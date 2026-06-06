"use client";

import { useActionState } from "react";
import RegionFields from "@/components/region-fields";
import { adminUpdateMember } from "../../../actions";

type Initial = {
  id: number;
  email: string;
  name: string;
  pronouns: string;
  role: string;
  companyName: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  website: string;
  linkedin: string;
  twitter: string;
  bio: string;
};

type CompanyOption = { id: number; name: string };

export default function EditMemberForm({ initial, companies }: { initial: Initial; companies: CompanyOption[] }) {
  const [state, formAction, pending] = useActionState(adminUpdateMember, {});

  return (
    <form action={formAction}>
      <input type="hidden" name="userId" value={initial.id} />

      <label htmlFor="email">Email</label>
      <input id="email" name="email" type="email" defaultValue={initial.email} required />

      <div className="field-grid">
        <div>
          <label htmlFor="name">Name</label>
          <input id="name" name="name" defaultValue={initial.name} />
        </div>
        <div>
          <label htmlFor="pronouns">Pronouns</label>
          <input id="pronouns" name="pronouns" defaultValue={initial.pronouns} placeholder="she/her, he/him, they/them" />
        </div>
        <div>
          <label htmlFor="role">Role / title</label>
          <input id="role" name="role" defaultValue={initial.role} />
        </div>
        <div>
          <label htmlFor="company_name">Company</label>
          <input id="company_name" name="company_name" list="company-options" defaultValue={initial.companyName} placeholder="Search or type to add" autoComplete="off" />
          <datalist id="company-options">
            {companies.map((c) => <option key={c.id} value={c.name} />)}
          </datalist>
        </div>
        <RegionFields city={initial.city} state={initial.state} zip={initial.zip} required />
        <div>
          <label htmlFor="phone">Phone</label>
          <input id="phone" name="phone" type="tel" defaultValue={initial.phone} />
        </div>
        <div>
          <label htmlFor="website">Website</label>
          <input id="website" name="website" type="url" defaultValue={initial.website} placeholder="https://" />
        </div>
        <div>
          <label htmlFor="linkedin">LinkedIn</label>
          <input id="linkedin" name="linkedin" defaultValue={initial.linkedin} placeholder="https://linkedin.com/in/…" />
        </div>
        <div>
          <label htmlFor="twitter">X / Twitter</label>
          <input id="twitter" name="twitter" defaultValue={initial.twitter} placeholder="@handle or URL" />
        </div>
      </div>

      <label htmlFor="bio">Short bio</label>
      <textarea id="bio" name="bio" defaultValue={initial.bio} />

      {state?.ok && <div className="note">Saved.</div>}
      {state?.error && <div className="error">{state.error}</div>}
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save member"}
      </button>
    </form>
  );
}
