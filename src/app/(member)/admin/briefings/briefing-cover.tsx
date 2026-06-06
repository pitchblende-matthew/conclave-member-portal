"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadCover, removeCover } from "./actions";

export default function BriefingCover({ id, coverUrl }: { id: number; coverUrl: string | null }) {
  const router = useRouter();
  const [upState, upAction, upPending] = useActionState(uploadCover, {});
  const [rmState, rmAction, rmPending] = useActionState(removeCover, {});
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (upState?.ok || rmState?.ok) {
      setPreview(null);
      router.refresh();
    }
  }, [upState, rmState, router]);

  const shown = preview ?? coverUrl;

  return (
    <form action={upAction}>
      <input type="hidden" name="briefingId" value={id} />
      <label className="meta">Cover image — JPG, PNG, or WebP, up to 5 MB</label>
      {shown ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={shown} alt="Cover preview" className="cover-preview" />
      ) : (
        <div className="cover-preview cover-empty">No cover yet</div>
      )}
      <input
        name="cover"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => {
          const file = e.target.files?.[0];
          setPreview(file ? URL.createObjectURL(file) : null);
        }}
      />
      <div className="btn-row">
        <button className="btn inline-btn" type="submit" disabled={upPending}>
          {upPending ? "Uploading…" : "Upload cover"}
        </button>
        {coverUrl && (
          <button className="btn btn-ghost inline-btn" formAction={rmAction} disabled={rmPending}>
            {rmPending ? "Removing…" : "Remove"}
          </button>
        )}
      </div>
      {upState?.error && <div className="error">{upState.error}</div>}
    </form>
  );
}
