// Renders a member/company image, or initials as a fallback placeholder.
// Plain <img> (not next/image) keeps it simple on the Cloudflare edge.

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "·";
  return parts.slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
}

export default function Avatar({
  src,
  name = "",
  size = 48,
}: {
  src?: string | null;
  name?: string;
  size?: number;
}) {
  const dimension = { width: size, height: size };
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img className="avatar" src={src} alt={name || "Member"} style={dimension} />
    );
  }
  return (
    <span
      className="avatar avatar-placeholder"
      style={{ ...dimension, fontSize: Math.round(size * 0.36) }}
      aria-hidden="true"
    >
      {initialsOf(name)}
    </span>
  );
}
