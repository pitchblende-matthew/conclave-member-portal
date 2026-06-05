"use client";

import { useActionState } from "react";
import { updateProfile } from "./actions";

type Initial = {
  name: string; company: string; role: string; location: string; bio: string; email: string;
};

export default function ProfileForm({ initial }: { initial: Initial }) {
  const [state, formAction, pending] = useActionState(updateProfile, {});
  return (
    <form action={formAction}>
      <label>Email</label>
      <input type="email" value={initial.email} disabled />
      <label htmlFor="name">Name</label>
      <input id="name" name="name" defaultValue={initial.name} />
      <label htmlFor="role">Role / title</label>
      <input id="role" name="role" defaultValue={initial.role} />
      <label htmlFor="company">Company</label>
      <input id="company" name="company" defaultValue={initial.company} />
      <label htmlFor="location">Location</label>
      <input id="location" name="location" defaultValue={initial.location} />
      <label htmlFor="bio">Short bio</label>
      <textarea id="bio" name="bio" defaultValue={initial.bio} />
      {state?.ok && <div className="note">Saved.</div>}
      {state?.error && <div className="error">{state.error}</div>}
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
