"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/avatar";
import { US_STATES } from "@/lib/us-states";
import { updateProfile, uploadAvatar, removeAvatar, uploadCover, removeCover } from "./actions";
import { completeOnboarding } from "@/app/onboarding/actions";

type Initial = {
  name: string;
  companyName: string;
  role: string;
  city: string;
  state: string;
  zip: string;
  pronouns: string;
  phone: string;
  website: string;
  linkedin: string;
  twitter: string;
  bio: string;
  email: string;
  avatarUrl: string | null;
  coverUrl: string | null;
};

type CompanyOption = { id: number; name: string };

export default function ProfileForm({
  initial,
  companies,
  mode = "profile",
}: {
  initial: Initial;
  companies: CompanyOption[];
  mode?: "profile" | "onboarding";
}) {
  const router = useRouter();
  const onboarding = mode === "onboarding";

  // Submit action imported directly (not passed as a prop) so the server-action
  // reference is stable on the client.
  const submit = onboarding ? completeOnboarding : updateProfile;

  // Avatar upload
  const [upState, upAction, upPending] = useActionState(uploadAvatar, {});
  const [rmState, rmAction, rmPending] = useActionState(removeAvatar, {});
  const [preview, setPreview] = useState<string | null>(null);

  // Cover upload
  const [covState, covAction, covPending] = useActionState(uploadCover, {});
  const [covRmState, covRmAction, covRmPending] = useActionState(removeCover, {});
  const [covPreview, setCovPreview] = useState<string | null>(null);

  // Details
  const [state, formAction, pending] = useActionState(submit, {});

  // Refresh server data after a successful image change so the stored image shows.
  useEffect(() => {
    if (upState?.ok || rmState?.ok || covState?.ok || covRmState?.ok) {
      setPreview(null);
      setCovPreview(null);
      router.refresh();
    }
  }, [upState, rmState, covState, covRmState, router]);

  const shownAvatar = preview ?? initial.avatarUrl;
  const shownCover = covPreview ?? initial.coverUrl;

  return (
    <>
      <div className="cover-edit-row">
        <div className="cover-edit" style={shownCover ? { backgroundImage: `url(${shownCover})` } : undefined}>
          {!shownCover && <span className="meta">No cover image yet</span>}
        </div>
        <form action={covAction}>
          <label htmlFor="cover" className="meta">Cover image — a wide JPG, PNG, or WebP, up to 5 MB</label>
          <input
            id="cover"
            name="cover"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              setCovPreview(file ? URL.createObjectURL(file) : null);
            }}
          />
          <div className="btn-row">
            <button className="btn inline-btn" type="submit" disabled={covPending}>
              {covPending ? "Uploading…" : "Upload cover"}
            </button>
            {initial.coverUrl && (
              <button className="btn btn-ghost inline-btn" formAction={covRmAction} disabled={covRmPending}>
                {covRmPending ? "Removing…" : "Remove"}
              </button>
            )}
          </div>
          {covState?.error && <div className="error">{covState.error}</div>}
        </form>
      </div>

      <div className="avatar-row">
        <Avatar src={shownAvatar} name={initial.name} size={88} />
        <div className="avatar-controls">
          <form action={upAction}>
            <label htmlFor="avatar" className="meta">Profile photo — JPG, PNG, or WebP, up to 5 MB</label>
            <input
              id="avatar"
              name="avatar"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                setPreview(file ? URL.createObjectURL(file) : null);
              }}
            />
            <div className="btn-row">
              <button className="btn inline-btn" type="submit" disabled={upPending}>
                {upPending ? "Uploading…" : "Upload photo"}
              </button>
              {initial.avatarUrl && (
                <button className="btn btn-ghost inline-btn" formAction={rmAction} disabled={rmPending}>
                  {rmPending ? "Removing…" : "Remove"}
                </button>
              )}
            </div>
            {upState?.error && <div className="error">{upState.error}</div>}
          </form>
        </div>
      </div>

      <form action={formAction}>
        <label>Email</label>
        <input type="email" value={initial.email} disabled />

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
            <input
              id="company_name"
              name="company_name"
              list="company-options"
              defaultValue={initial.companyName}
              placeholder="Search or type to add"
              autoComplete="off"
            />
            <datalist id="company-options">
              {companies.map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
            <p className="note" style={{ marginTop: "0.35rem" }}>
              Pick an existing company, or type a new name to add it.
            </p>
          </div>
          <div>
            <label htmlFor="city">City</label>
            <input id="city" name="city" defaultValue={initial.city} autoComplete="address-level2" required />
          </div>
          <div>
            <label htmlFor="state">State</label>
            <select id="state" name="state" defaultValue={initial.state} autoComplete="address-level1" required>
              <option value="" disabled>Choose…</option>
              {US_STATES.map((s) => (
                <option key={s.abbr} value={s.abbr}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="zip">ZIP code</label>
            <input id="zip" name="zip" inputMode="numeric" pattern="\d{5}" maxLength={5} defaultValue={initial.zip} autoComplete="postal-code" required />
            <p className="note" style={{ marginTop: "0.35rem" }}>Sets your media market for area filters.</p>
          </div>
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

        {!onboarding && state?.ok && <div className="note">Saved.</div>}
        {state?.error && <div className="error">{state.error}</div>}
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Saving…" : onboarding ? "Finish & enter" : "Save changes"}
        </button>
      </form>
    </>
  );
}
