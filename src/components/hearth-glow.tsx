import type { CSSProperties } from "react";

// Decorative "Hearth" animation: a slow breathing coal-glow with embers drifting
// upward. Pure CSS (see .hearth-* rules in globals.css) so it renders as a server
// component with no client JS, and it's hidden for prefers-reduced-motion users.
//
// Sits absolutely positioned inside a `position: relative` parent (e.g. the auth
// wrapper) behind the foreground content. Aria-hidden — purely ornamental.

// Deterministic spark layout so server and client markup match (no hydration drift).
let seed = 7;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const r = (a: number, b: number) => a + rnd() * (b - a);

const EMBERS = Array.from({ length: 22 }, () => ({
  size: r(2, 6.5),
  x: r(6, 94),
  rise: r(240, 520),
  sway: r(-26, 26),
  dur: r(5.5, 11),
  delay: -r(0, 11),
  peak: r(0.45, 0.95),
  hot: rnd() > 0.7,
}));

export default function HearthGlow() {
  return (
    <div className="hearth" aria-hidden="true">
      <div className="hearth-glow" />
      <div className="hearth-glow two" />
      <div className="hearth-embers">
        {EMBERS.map((e, i) => (
          <span
            key={i}
            className={e.hot ? "hearth-ember hot" : "hearth-ember"}
            style={
              {
                "--size": `${e.size.toFixed(1)}px`,
                "--x": `${e.x.toFixed(2)}%`,
                "--rise": `${e.rise.toFixed(0)}px`,
                "--sway": `${e.sway.toFixed(0)}px`,
                "--dur": `${e.dur.toFixed(2)}s`,
                "--delay": `${e.delay.toFixed(2)}s`,
                "--peak": e.peak.toFixed(2),
              } as CSSProperties
            }
          />
        ))}
      </div>
      <div className="hearth-vignette" />
    </div>
  );
}
