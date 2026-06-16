import { Flame } from "./icons";

// The Conclave wordmark: a bracketed flame + serif name, rendered inline so it
// adapts to the current theme (the name uses --ink, readable on light and dark).
// `size` controls the rendered font size (rem).
export default function Wordmark({ size = 1.5 }: { size?: number }) {
  return (
    <span className="wordmark" style={{ fontSize: `${size}rem` }}>
      <span className="wordmark-bracket" aria-hidden>[</span>
      <Flame className="wordmark-flame" />
      <span className="wordmark-text">Conclave</span>
      <span className="wordmark-bracket" aria-hidden>]</span>
    </span>
  );
}
