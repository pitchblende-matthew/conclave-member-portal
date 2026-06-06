"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markAllRead } from "@/app/(member)/notifications/actions";

export type BellItem = { id: number; href: string; text: string; created_at: number; read: boolean };

function ago(ms: number): string {
  const s = Math.max(1, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d}d ago` : `${Math.floor(d / 7)}w ago`;
}

export default function NotificationsBell({ items, unread }: { items: BellItem[]; unread: number }) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const toggle = () => {
    const next = !open;
    setOpen(next);
    // Opening the panel marks everything seen.
    if (next && unread > 0) {
      startTransition(async () => {
        await markAllRead();
        router.refresh();
      });
    }
  };

  return (
    <div className="bell">
      <button type="button" className="bell-btn" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} aria-expanded={open} onClick={toggle}>
        <svg className="bell-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable="false">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {unread > 0 && <span className="bell-badge">{unread > 9 ? "9+" : unread}</span>}
      </button>

      {open && (
        <>
          <button type="button" className="bell-backdrop" aria-label="Close notifications" onClick={() => setOpen(false)} />
          <div className="bell-panel" role="menu">
            <div className="bell-head">Notifications</div>
            {items.length === 0 ? (
              <p className="meta" style={{ padding: "0.85rem 0.9rem", margin: 0 }}>You&apos;re all caught up.</p>
            ) : (
              items.map((n) => (
                <Link key={n.id} href={n.href} className={`bell-item${n.read ? "" : " unread"}`} onClick={() => setOpen(false)}>
                  <span>{n.text}</span>
                  <span className="bell-time">{ago(n.created_at)}</span>
                </Link>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
