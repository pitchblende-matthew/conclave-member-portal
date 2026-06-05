"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/avatar";
import { updateProfile, uploadAvatar, removeAvatar } from "./actions";

type Initial = {
  name: string;
  company: string;
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

export default function ProfileForm({ initial }: { initial: Initial }) {
  const router = useRouter();

  // Avatar upload
  const [upState, upAction, upPending] = useActionState(uploadAvatar, {});
  const [rmState, rmAction, rmPending] = useActionState(removeAvatar, {});
  const [preview, setPreview] = useState<string | null>(null);

  // Details
  const [state, formAction, pending] = useActionState(updateProfile, {});

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
            <label htmlFor="company">Company</label>
            <input id="company" name="company" defaultValue={initial.company} />
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

        {state?.ok && <div className="note">Saved.</div>}
        {state?.error && <div className="error">{state.error}</div>}
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </button>
      </form>
    </>
  );
}
