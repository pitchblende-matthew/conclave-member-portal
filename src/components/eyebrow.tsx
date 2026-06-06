import Icon, { type IconName } from "./icons";

// The small mono "eyebrow" label, now with a leading icon.
export default function Eyebrow({ icon, children }: { icon: IconName; children: React.ReactNode }) {
  return (
    <span className="tag tag-ico"><Icon name={icon} size={13} strokeWidth={1.8} />{children}</span>
  );
}
