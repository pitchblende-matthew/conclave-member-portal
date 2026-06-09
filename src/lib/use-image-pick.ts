import { useCallback, useState } from "react";
import { prepareImageInput } from "./image-resize";

// Shared client behaviour for an image file <input>: downscale the picked image
// to fit, swap it into the input, and expose preview / busy / error state.
export function useImagePick(initialUrl: string | null = null) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget; // capture before awaiting (React clears it)
    const file = input.files?.[0];
    if (!file) { setPreviewUrl(null); setError(null); return; }
    setError(null);
    setBusy(true);
    const res = await prepareImageInput(input, file);
    setBusy(false);
    if ("error" in res) { setError(res.error); setPreviewUrl(null); return; }
    setPreviewUrl(res.previewUrl);
  }, []);

  const reset = useCallback(() => { setPreviewUrl(null); setError(null); }, []);

  return { previewUrl, error, busy, onChange, reset, shown: previewUrl ?? initialUrl };
}
