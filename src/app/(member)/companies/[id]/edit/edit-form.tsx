"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/avatar";
import RegionFields from "@/components/region-fields";
import { useImagePick } from "@/lib/use-image-pick";
import type { Industry } from "@/lib/industries";
import { updateCompany, uploadCompanyLogo, removeCompanyLogo, uploadCompanyCover, removeCompanyCover } from "../../actions";

type Initial = {
  id: number;
  name: string;
  website: string;
  linkedin: string;
  industry_id: number;
  size: string;
  city: string;
  state: string;
  zip: string;
  description: string;
  logoUrl: string | null;
  coverUrl: string | null;
};

export default function EditCompanyForm({ initial, industries }: { initial: Initial; industries: Industry[] }) {
  const router = useRouter();
  const [logoState, logoAction, logoPending] = useActionState(uploadCompanyLogo, {});
  const [rmState, rmAction, rmPending] = useActionState(removeCompanyLogo, {});
  const logo = useImagePick(initial.logoUrl);
  const [covState, covAction, covPending] = useActionState(uploadCompanyCover, {});
  const [covRmState, covRmAction, covRmPending] = useActionState(removeCompanyCover, {});
  const cover = useImagePick(initial.coverUrl);
  const [state, formAction, pending] = useActionState(updateCompany, {});

  useEffect(() => {
    if (logoState?.ok || rmState?.ok || covState?.ok || covRmState?.ok) {
      logo.reset();
      cover.reset();
      router.refresh();
    }
  }, [logoState, rmState, covState, covRmState, router, logo.reset, cover.reset]);

  const shownLogo = logo.shown;
  const shownCover = cover.shown;

  return (
    <>
      <div className="cover-edit-row">
        <div className="cover-edit" style={shownCover ? { backgroundImage: `url(${shownCover})` } : undefined}>
          {!shownCover && <span className="meta">No cover image yet</span>}
        </div>
        <form action={covAction}>
          <input type="hidden" name="companyId" value={initial.id} />
          <label htmlFor="cover" className="meta">Cover image — a wide JPG, PNG, or WebP. Large images are resized to fit.</label>
          <input id="cover" name="cover" type="file" accept="image/jpeg,image/png,image/webp" onChange={cover.onChange} />
          <div className="btn-row">
            <button className="btn inline-btn" type="submit" disabled={covPending || cover.busy || !!cover.error}>
              {cover.busy ? "Optimizing…" : covPending ? "Uploading…" : "Upload cover"}
            </button>
            {initial.coverUrl && (
              <button className="btn btn-ghost inline-btn" formAction={covRmAction} disabled={covRmPending}>
                {covRmPending ? "Removing…" : "Remove"}
              </button>
            )}
          </div>
          {(cover.error || covState?.error) && <div className="error" role="alert">{cover.error || covState?.error}</div>}
        </form>
      </div>

      <div className="avatar-row">
        <Avatar src={shownLogo} name={initial.name} size={88} />
        <div className="avatar-controls">
          <form action={logoAction}>
            <input type="hidden" name="companyId" value={initial.id} />
            <label htmlFor="logo" className="meta">Logo — JPG, PNG, or WebP. Large images are resized to fit.</label>
            <input id="logo" name="logo" type="file" accept="image/jpeg,image/png,image/webp" onChange={logo.onChange} />
            <div className="btn-row">
              <button className="btn inline-btn" type="submit" disabled={logoPending || logo.busy || !!logo.error}>
                {logo.busy ? "Optimizing…" : logoPending ? "Uploading…" : "Upload logo"}
              </button>
              {initial.logoUrl && (
                <button className="btn btn-ghost inline-btn" formAction={rmAction} disabled={rmPending}>
                  {rmPending ? "Removing…" : "Remove"}
                </button>
              )}
            </div>
            {(logo.error || logoState?.error) && <div className="error" role="alert">{logo.error || logoState?.error}</div>}
          </form>
        </div>
      </div>

      <form action={formAction}>
        <input type="hidden" name="companyId" value={initial.id} />
        <label htmlFor="name">Company name</label>
        <input id="name" name="name" defaultValue={initial.name} required />

        <div className="field-grid">
          <div>
            <label htmlFor="industry_id">Industry</label>
            <select id="industry_id" name="industry_id" defaultValue={String(initial.industry_id || "")}>
              <option value="">Select…</option>
              {industries.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
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
        {state?.error && <div className="error" role="alert">{state.error}</div>}
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </button>
      </form>
    </>
  );
}
