// The Conclave bracketed-flame logo, served from the marketing site's Webflow
// asset CDN so both surfaces share one source of truth. `size` sets the rendered
// height (rem). The portal swaps to the reversed (light) logo in dark mode via
// CSS; pass `reverse` to force the light logo (e.g. on the dark auth background).
const LOGO =
  "https://cdn.prod.website-files.com/6a1629364bb647e65a025817/6a256014a18d5d024dbc45bc_conclave-bracketed-1600.png";
const LOGO_REVERSE =
  "https://cdn.prod.website-files.com/6a1629364bb647e65a025817/6a256737f9cbac0dbff4b4dc_conclave-bracketed-reverse-1600.png";

export default function Wordmark({ size = 1.5, reverse = false }: { size?: number; reverse?: boolean }) {
  const height = `${size * 1.5}rem`;
  if (reverse) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={LOGO_REVERSE} alt="Conclave" className="wordmark-img" style={{ height, width: "auto", display: "block" }} />
    );
  }
  return (
    <span className="wordmark" style={{ height }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LOGO} alt="Conclave" className="wordmark-img wordmark-img-light" style={{ height, width: "auto" }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LOGO_REVERSE} alt="" aria-hidden className="wordmark-img wordmark-img-dark" style={{ height, width: "auto" }} />
    </span>
  );
}
