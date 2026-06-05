"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Avatar from "@/components/avatar";
import { updateProfile, uploadAvatar, removeAvatar, type ProfileState } from "./actions";

type Initial = {
  name: string;
  companyId: number;
  role: string;
  location: string;
  pronouns: string;
  phone: string;
  website: string;
  linkedin: string;
  twitter: string;
  bio: string;
  email: string;
  avatarUrl: string | null;
};

type CompanyOption = { id: number; name: string };

export default function ProfileForm({
  initial,
  companies,
  submitAction = updateProfile,
  submitLabel = "Save changes",
  showSaved = true,
  allowCreateCompany = true,
}: {
  initial: Initial;
  companies: CompanyOption[];
  submitAction?: (prev: ProfileState, formData: FormData) => Promise<ProfileState>;
  submitLabel?: string;
  showSaved?: boolean;
  allowCreateCompany?: boolean;
}) {
  const router = useRouter();

  // Avatar upload
  const [upState, upAction, upPending] = useActionState(uploadAvatar, {});
  const [rmState, rmAction, rmPending] = useActionState(removeAvatar, {});
  const [preview, setPreview] = useState<string | null>(null);

  // Details
  const [state, formAction, pending] = useActionState(submitAction, {});

  // Refresh server data after a successful avatar change so the stored image shows.
  useEffect(() => {
    if (upState?.ok || rmState?.ok) {
      setPreview(null);
      router.refresh();
    }
  }, [upState, rmState, router]);

  const shownAvatar = preview ?? initial.avatarUrl;

  return (
    <>
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
            <label htmlFor="company_id">Company</label>
            <select id="company_id" name="company_id" defaultValue={String(initial.companyId)}>
              <option value="0">— None —</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {allowCreateCompany && (
              <p className="note" style={{ marginTop: "0.35rem" }}>
                Not listed? <Link href="/companies/new">Add a company</Link>.
              </p>
            )}
          </div>
          <div>
            <label htmlFor="location">Location</label>
            <input id="location" name="location" defaultValue={initial.location} />
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

        {showSaved && state?.ok && <div className="note">Saved.</div>}
        {state?.error && <div className="error">{state.error}</div>}
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </button>
      </form>
    </>
  );
}
