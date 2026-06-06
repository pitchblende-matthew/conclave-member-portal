import { Sprig } from "./icons";

// A hairline rule with a centered olive sprig, for separating page sections.
export default function SectionDivider() {
  return (
    <div className="divider" role="separator" aria-hidden>
      <span className="divider-line" />
      <Sprig size={18} className="divider-sprig" />
      <span className="divider-line" />
    </div>
  );
}
