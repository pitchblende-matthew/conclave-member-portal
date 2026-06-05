// Human-readable timestamp. Times are rendered in UTC for consistency on the edge.
export function formatDateTime(ms: number): string {
  try {
    return (
      new Date(ms).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "UTC",
      }) + " UTC"
    );
  } catch {
    return "";
  }
}
