// The Conclave wordmark: the bracketed flame logo, matching the marketing site.
// Served from the marketing site's Webflow asset CDN so both surfaces share one
// source of truth for the brand mark. `size` controls the rendered height (rem).
const LOGO_SRC =
  "https://cdn.prod.website-files.com/6a1629364bb647e65a025817/6a256014a18d5d024dbc45bc_conclave-bracketed-1600.png";

export default function Wordmark({ size = 1.5 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={LOGO_SRC}
      alt="Conclave"
      className="wordmark-img"
      style={{ height: `${size * 1.5}rem`, width: "auto", display: "block" }}
    />
  );
}
