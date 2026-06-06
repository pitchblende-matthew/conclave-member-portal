import { Sprig } from "./icons";

// A softer, more designed empty state than a bare line of text.
export default function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="empty-state">
      <Sprig size={34} className="empty-sprig" />
      <p className="empty-title">{title}</p>
      {children ? <p className="meta" style={{ margin: 0 }}>{children}</p> : null}
    </div>
  );
}
