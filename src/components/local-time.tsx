"use client";

import { useEffect, useState } from "react";

const MODES: Record<string, Intl.DateTimeFormatOptions> = {
  datetime: { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" },
  datetimeLong: { weekday: "short", month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" },
  date: { weekday: "short", month: "long", day: "numeric", year: "numeric" },
  dayshort: { weekday: "short", month: "short", day: "numeric" },
};

export type TimeMode = keyof typeof MODES;

function fmt(ms: number, mode: TimeMode, tz?: string): string {
  try {
    const opts: Intl.DateTimeFormatOptions = { ...MODES[mode] };
    if (tz) opts.timeZone = tz;
    if (mode === "datetime" || mode === "datetimeLong") opts.timeZoneName = "short";
    return new Date(ms).toLocaleString("en-US", opts);
  } catch {
    return "";
  }
}

// Renders a timestamp in the viewer's local timezone. The server (and the first
// client paint) render UTC so hydration is deterministic; on mount we re-render
// in the browser's timezone. suppressHydrationWarning covers the swap.
export default function LocalTime({ ms, mode = "datetime" }: { ms: number; mode?: TimeMode }) {
  const [text, setText] = useState(() => fmt(ms, mode, "UTC"));
  useEffect(() => {
    setText(fmt(ms, mode));
  }, [ms, mode]);
  return (
    <time dateTime={new Date(ms).toISOString()} suppressHydrationWarning>{text}</time>
  );
}
