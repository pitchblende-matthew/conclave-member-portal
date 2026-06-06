"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/avatar";
import RegionFields from "@/components/region-fields";
import { updateCompany, uploadCompanyLogo, removeCompanyLogo } from "../../actions";

type Initial = {
  id: number;
  name: string;
  website: string;
  linkedin: string;
  industry: string;
  size: string;
  city: string;
  state: string;
  zip: string;
  description: string;
  logoUrl: string | null;
};

export default function EditCompanyForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [logoState, logoAction, logoPending] = useActionState(uploadCompanyLogo, {});
  const [rmState, rmAction, rmPending] = useActionState(removeCompanyLogo, {});
  const [preview, setPreview] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(updateCompany, {});

  useEffect(() => {
    if (logoState?.ok || rmState?.ok) {
      setPreview(null);
      router.refresh();
    }
  }, [logoState, rmState, router]);

  const shownLogo = preview ?? initial.logoUrl;

  return (
    <>
      <div className="avatar-row">
        <Avatar src={shownLogo} name={initial.name} size={88} />
        <div className="avatar-controls">
          <form action={logoAction}>
            <input type="hidden" name="companyId" value={initial.id} />
            <label htmlFor="logo" className="meta">Logo — JPG, PNG, or WebP, up to 5 MB</label>
            <input
              id="logo"
              name="logo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                setPreview(file ? URL.createObjectURL(file) : null);
              }}
            />
            <div className="btn-row">
              <button className="btn inline-btn" type="submit" disabled={logoPending}>
                {logoPending ? "Uploading…" : "Upload logo"}
              </button>
              {initial.logoUrl && (
                <button className="btn btn-ghost inline-btn" formAction={rmAction} disabled={rmPending}>
                  {rmPending ? "Removing…" : "Remove"}
                </button>
              )}
            </div>
            {logoState?.error && <div className="error">{logoState.error}</div>}
          </form>
        </div>
      </div>

      <form action={formAction}>
        <input type="hidden" name="companyId" value={initial.id} />
        <label htmlFor="name">Company name</label>
        <input id="name" name="name" defaultValue={initial.name} required />

        <div className="field-grid">
          <div>
            <label htmlFor="industry">Industry</label>
            <input id="industry" name="industry" defaultValue={initial.industry} />
          </div>
          <div>
            <label htmlFor="size">Size</label>
            <input id="size" name="size" defaultValue={initial.size} placeholder="e.g. 11–50" />
          </div>
          <div>
            <label htmlFor="website">Website</label>
            <input id="website" name="website" type="url" defaultValue={initial.website} placeholder="https://" />
          </div>
          <div>
            <label htmlFor="linkedin">LinkedIn</label>
            <input id="linkedin" name="linkedin" type="url" defaultValue={initial.linkedin} placeholder="https://linkedin.com/company/…" />
          </div>
          <RegionFields city={initial.city} state={initial.state} zip={initial.zip} />
        </div>

        <label htmlFor="description">Description</label>
        <textarea id="description" name="description" defaultValue={initial.description} />

        {state?.ok && <div className="note">Saved.</div>}
        {state?.error && <div className="error">{state.error}</div>}
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </button>
      </form>
    </>
  );
}
