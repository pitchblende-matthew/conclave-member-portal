"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useImagePick } from "@/lib/use-image-pick";
import { uploadCover, removeCover } from "./actions";

export default function BriefingCover({ id, coverUrl }: { id: number; coverUrl: string | null }) {
  const router = useRouter();
  const [upState, upAction, upPending] = useActionState(uploadCover, {});
  const [rmState, rmAction, rmPending] = useActionState(removeCover, {});
  const cover = useImagePick(coverUrl);

  useEffect(() => {
    if (upState?.ok || rmState?.ok) {
      cover.reset();
      router.refresh();
    }
  }, [upState, rmState, router, cover.reset]);

  return (
    <form action={upAction}>
      <input type="hidden" name="briefingId" value={id} />
      <label className="meta">Cover image — JPG, PNG, or WebP. Large images are resized to fit.</label>
      {cover.shown ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover.shown} alt="Cover preview" className="cover-preview" />
      ) : (
        <div className="cover-preview cover-empty">No cover yet</div>
      )}
      <input name="cover" type="file" accept="image/jpeg,image/png,image/webp" onChange={cover.onChange} />
      <div className="btn-row">
        <button className="btn inline-btn" type="submit" disabled={upPending || cover.busy || !!cover.error}>
          {cover.busy ? "Optimizing…" : upPending ? "Uploading…" : "Upload cover"}
        </button>
        {coverUrl && (
          <button className="btn btn-ghost inline-btn" formAction={rmAction} disabled={rmPending}>
            {rmPending ? "Removing…" : "Remove"}
          </button>
        )}
      </div>
      {(cover.error || upState?.error) && <div className="error" role="alert">{cover.error || upState?.error}</div>}
    </form>
  );
}
