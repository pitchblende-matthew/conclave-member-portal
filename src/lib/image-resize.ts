// Client-side image downscaling. Returns a File that fits within `maxDim` (longest
// edge) and `maxBytes`, re-encoding to JPEG when it must shrink. Anything already
// small enough is returned untouched, and any failure falls back to the original
// file (the upload form still guards size as a backstop).

type Options = { maxDim?: number; maxBytes?: number };

export async function resizeImage(file: File, { maxDim = 2400, maxBytes = 4.5 * 1024 * 1024 }: Options = {}): Promise<File> {
  if (typeof document === "undefined" || !file.type.startsWith("image/")) return file;

  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await loadImage(file);
  } catch {
    return file;
  }

  const w = "naturalWidth" in source ? source.naturalWidth : source.width;
  const h = "naturalHeight" in source ? source.naturalHeight : source.height;
  const longest = Math.max(w, h);

  // Already within bounds — keep the original (preserves format/quality).
  if (longest <= maxDim && file.size <= maxBytes) {
    close(source);
    return file;
  }

  const scale = longest > maxDim ? maxDim / longest : 1;
  const tw = Math.max(1, Math.round(w * scale));
  const th = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    close(source);
    return file;
  }
  ctx.drawImage(source as CanvasImageSource, 0, 0, tw, th);
  close(source);

  // Step quality down until the encoded image fits the byte budget.
  let quality = 0.9;
  let blob = await toBlob(canvas, quality);
  while (blob && blob.size > maxBytes && quality > 0.4) {
    quality -= 0.15;
    blob = await toBlob(canvas, quality);
  }
  if (!blob) return file;

  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
}

function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") return createImageBitmap(file);
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode failed"));
    };
    img.src = url;
  });
}

function close(source: ImageBitmap | HTMLImageElement): void {
  if ("close" in source && typeof source.close === "function") source.close();
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", quality));
}
