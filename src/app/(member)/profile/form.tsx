"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/avatar";
import { US_STATES } from "@/lib/us-states";
import type { Taxon } from "@/lib/member-taxonomy";
import type { Expertise } from "@/lib/expertise";
import { prepareImageInput } from "@/lib/image-resize";
import { updateProfile, uploadAvatar, removeAvatar, uploadCover, removeCover } from "./actions";
import { completeOnboarding } from "@/app/onboarding/actions";

type Initial = {
  name: string;
  companyName: string;
  role: string;
  function_id: number;
  seniority_id: number;
  expertiseIds: number[];
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
  discoverRegionOnly: boolean;
  discoverPeersOnly: boolean;
  avatarUrl: string | null;
  coverUrl: string | null;
};

type CompanyOption = { id: number; name: string };

export default function ProfileForm({
  initial,
  companies,
  functions,
  seniorities,
  expertise,
  maxExpertise,
  mode = "profile",
}: {
  initial: Initial;
  companies: CompanyOption[];
  functions: Taxon[];
  seniorities: Taxon[];
  expertise: Expertise[];
  maxExpertise: number;
  mode?: "profile" | "onboarding";
}) {
  const router = useRouter();
  const onboarding = mode === "onboarding";

  // Areas of expertise — a capped multi-select rendered as toggle chips.
  const [expSel, setExpSel] = useState<Set<number>>(() => new Set(initial.expertiseIds));
  const toggleExp = (id: number) =>
    setExpSel((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < maxExpertise) next.add(id);
      return next;
    });

  // Submit action imported directly (not passed as a prop) so the server-action
  // reference is stable on the client.
  const submit = onboarding ? completeOnboarding : updateProfile;

  // Avatar upload
  const [upState, upAction, upPending] = useActionState(uploadAvatar, {});
  const [rmState, rmAction, rmPending] = useActionState(removeAvatar, {});
  const [preview, setPreview] = useState<string | null>(null);
  const [avaError, setAvaError] = useState<string | null>(null);
  const [avaBusy, setAvaBusy] = useState(false);

  // Cover upload
  const [covState, covAction, covPending] = useActionState(uploadCover, {});
  const [covRmState, covRmAction, covRmPending] = useActionState(removeCover, {});
  const [covPreview, setCovPreview] = useState<string | null>(null);
  const [covError, setCovError] = useState<string | null>(null);
  const [covBusy, setCovBusy] = useState(false);

  // On pick: downscale large images in the browser so they fit, swap the resized
  // file back into the input (that's what gets posted), and preview it.
  const handlePick = async (
    input: HTMLInputElement,
    file: File,
    setPreviewUrl: (u: string | null) => void,
    setError: (m: string | null) => void,
    setBusy: (b: boolean) => void
  ): Promise<void> => {
    setError(null);
    setBusy(true);
    const res = await prepareImageInput(input, file);
    setBusy(false);
    if ("error" in res) { setError(res.error); setPreviewUrl(null); return; }
    setPreviewUrl(res.previewUrl);
  };

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
          <label htmlFor="cover" className="meta">Cover image — a wide JPG, PNG, or WebP. Large images are resized to fit.</label>
          <input
            id="cover"
            name="cover"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const input = e.currentTarget;
              const file = input.files?.[0];
              if (!file) { setCovPreview(null); setCovError(null); return; }
              void handlePick(input, file, setCovPreview, setCovError, setCovBusy);
            }}
          />
          <div className="btn-row">
            <button className="btn inline-btn" type="submit" disabled={covPending || covBusy || !!covError}>
              {covBusy ? "Optimizing…" : covPending ? "Uploading…" : "Upload cover"}
            </button>
            {initial.coverUrl && (
              <button className="btn btn-ghost inline-btn" formAction={covRmAction} disabled={covRmPending}>
                {covRmPending ? "Removing…" : "Remove"}
              </button>
            )}
          </div>
          {(covError || covState?.error) && <div className="error" role="alert">{covError || covState?.error}</div>}
        </form>
      </div>

      <div className="avatar-row">
        <Avatar src={shownAvatar} name={initial.name} size={88} />
        <div className="avatar-controls">
          <form action={upAction}>
            <label htmlFor="avatar" className="meta">Profile photo — JPG, PNG, or WebP. Large images are resized to fit.</label>
            <input
              id="avatar"
              name="avatar"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const input = e.currentTarget;
                const file = input.files?.[0];
                if (!file) { setPreview(null); setAvaError(null); return; }
                void handlePick(input, file, setPreview, setAvaError, setAvaBusy);
              }}
            />
            <div className="btn-row">
              <button className="btn inline-btn" type="submit" disabled={upPending || avaBusy || !!avaError}>
                {avaBusy ? "Optimizing…" : upPending ? "Uploading…" : "Upload photo"}
              </button>
              {initial.avatarUrl && (
                <button className="btn btn-ghost inline-btn" formAction={rmAction} disabled={rmPending}>
                  {rmPending ? "Removing…" : "Remove"}
                </button>
              )}
            </div>
            {(avaError || upState?.error) && <div className="error" role="alert">{avaError || upState?.error}</div>}
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
            <input id="role" name="role" defaultValue={initial.role} placeholder="e.g. Head of Demand Gen" />
          </div>
          <div>
            <label htmlFor="function_id">Function</label>
            <select id="function_id" name="function_id" defaultValue={String(initial.function_id || "")}>
              <option value="">Select…</option>
              {functions.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="seniority_id">Seniority</label>
            <select id="seniority_id" name="seniority_id" defaultValue={String(initial.seniority_id || "")}>
              <option value="">Select…</option>
              {seniorities.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
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

        {expertise.length > 0 && (
          <fieldset className="discover-box">
            <legend>Areas of expertise <span className="meta">(up to {maxExpertise})</span></legend>
            <div className="chip-select">
              {expertise.map((e) => {
                const on = expSel.has(e.id);
                const blocked = !on && expSel.size >= maxExpertise;
                return (
                  <label key={e.id} className={`chip chip-toggle${on ? " chip-active" : ""}${blocked ? " chip-disabled" : ""}`}>
                    <input
                      type="checkbox"
                      name="expertise"
                      value={e.id}
                      checked={on}
                      disabled={blocked}
                      onChange={() => toggleExp(e.id)}
                    />
                    {e.name}
                  </label>
                );
              })}
            </div>
            <p className="note" style={{ marginTop: "0.4rem" }}>
              Shown on your profile and used to filter the directory. {expSel.size}/{maxExpertise} selected.
            </p>
          </fieldset>
        )}

        <fieldset className="discover-box">
          <legend>Discoverability <span className="meta">(optional)</span></legend>
          <label className="check-row">
            <input type="checkbox" name="discover_region_only" defaultChecked={initial.discoverRegionOnly} />
            Only members in my market can discover me
          </label>
          <label className="check-row">
            <input type="checkbox" name="discover_peers_only" defaultChecked={initial.discoverPeersOnly} />
            Only members who share my function or seniority can discover me
          </label>
          <p className="note" style={{ marginTop: "0.4rem" }}>
            ⚠︎ Turning either on <strong>limits where you appear</strong> — you may be left out of the
            directory, the by-function browse, and member search for anyone outside your selection.
            Members can still reach your profile from things you post.
          </p>
        </fieldset>

        {!onboarding && state?.ok && <div className="note">Saved.</div>}
        {state?.error && <div className="error" role="alert">{state.error}</div>}
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Saving…" : onboarding ? "Finish & enter" : "Save changes"}
        </button>
      </form>
    </>
  );
}
