"use client";

import Link from "next/link";
import { useState } from "react";

// Responsive member navigation: grouped menus on desktop (a "Network" and an
// "Account" dropdown keep the bar uncluttered), and a single hamburger panel on
// mobile where every link is shown expanded.
export default function MemberNav({ isAdmin, logoutHref }: { isAdmin: boolean; logoutHref: string }) {
  const [open, setOpen] = useState(false); // mobile panel
  const [menu, setMenu] = useState<string | null>(null); // open desktop dropdown

  const close = () => { setOpen(false); setMenu(null); };
  const toggleMenu = (name: string) => setMenu((m) => (m === name ? null : name));

  return (
    <>
      <button
        type="button"
        className="nav-toggle"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="nav-toggle-icon">{open ? "✕" : "☰"}</span>
      </button>

      <nav className={`member-nav${open ? " open" : ""}`}>
        <Link href="/dashboard" className="nav-link" onClick={close}>Dashboard</Link>
        <Link href="/board" className="nav-link" onClick={close}>Board</Link>
        <Link href="/events" className="nav-link" onClick={close}>Events</Link>
        <Link href="/briefings" className="nav-link" onClick={close}>Briefings</Link>

        <div className={`nav-group${menu === "network" ? " open" : ""}`}>
          <button type="button" className="nav-link nav-group-btn" aria-expanded={menu === "network"} onClick={() => toggleMenu("network")}>
            Network <span className="caret" aria-hidden>▾</span>
          </button>
          <div className="nav-dropdown">
            <Link href="/directory" className="nav-drop-link" onClick={close}>Members</Link>
            <Link href="/companies" className="nav-drop-link" onClick={close}>Companies</Link>
          </div>
        </div>

        <div className={`nav-group${menu === "account" ? " open" : ""}`}>
          <button type="button" className="nav-link nav-group-btn" aria-expanded={menu === "account"} onClick={() => toggleMenu("account")}>
            Account <span className="caret" aria-hidden>▾</span>
          </button>
          <div className="nav-dropdown">
            <Link href="/profile" className="nav-drop-link" onClick={close}>Profile</Link>
            {isAdmin && <Link href="/admin" className="nav-drop-link" onClick={close}>Admin</Link>}
            <a href={logoutHref} className="nav-drop-link">Sign out</a>
          </div>
        </div>
      </nav>
    </>
  );
}
