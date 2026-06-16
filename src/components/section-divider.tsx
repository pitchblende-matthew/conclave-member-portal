import { Flame } from "./icons";

// A hairline rule with a centered flame, for separating page sections.
export default function SectionDivider() {
  return (
    <div className="divider" role="separator" aria-hidden>
      <span className="divider-line" />
      <Flame size={16} className="divider-flame" />
      <span className="divider-line" />
    </div>
  );
}
