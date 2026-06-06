"use client";

import Link from "next/link";
import { useState } from "react";
import Icon from "@/components/icons";

// Responsive member navigation: grouped menus on desktop (a "Network" and an
// "Account" dropdown keep the bar uncluttered), and a single hamburger panel on
// mobile where every link is shown expanded.
export default function MemberNav({ isAdmin, logoutHref, unreadMessages = 0 }: { isAdmin: boolean; logoutHref: string; unreadMessages?: number }) {
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
        <Link href="/dashboard" className="nav-link" onClick={close}><Icon name="dashboard" size={16} />Dashboard</Link>
        <Link href="/board" className="nav-link" onClick={close}><Icon name="board" size={16} />Board</Link>
        <Link href="/events" className="nav-link" onClick={close}><Icon name="events" size={16} />Events</Link>
        <Link href="/briefings" className="nav-link" onClick={close}><Icon name="briefings" size={16} />Briefings</Link>

        <div className={`nav-group${menu === "network" ? " open" : ""}`}>
          <button type="button" className="nav-link nav-group-btn" aria-expanded={menu === "network"} onClick={() => toggleMenu("network")}>
            <Icon name="members" size={16} />Network <span className="caret" aria-hidden>▾</span>
          </button>
          <div className="nav-dropdown">
            <Link href="/directory" className="nav-drop-link" onClick={close}><Icon name="members" size={16} />Members</Link>
            <Link href="/companies" className="nav-drop-link" onClick={close}><Icon name="companies" size={16} />Companies</Link>
            <Link href="/connections" className="nav-drop-link" onClick={close}><Icon name="connections" size={16} />Connections</Link>
            <Link href="/messages" className="nav-drop-link" onClick={close}>
              <Icon name="message" size={16} />Messages
              {unreadMessages > 0 ? <span className="nav-badge">{unreadMessages > 9 ? "9+" : unreadMessages}</span> : null}
            </Link>
          </div>
        </div>

        <div className={`nav-group${menu === "account" ? " open" : ""}`}>
          <button type="button" className="nav-link nav-group-btn" aria-expanded={menu === "account"} onClick={() => toggleMenu("account")}>
            <Icon name="profile" size={16} />Account <span className="caret" aria-hidden>▾</span>
          </button>
          <div className="nav-dropdown">
            <Link href="/profile" className="nav-drop-link" onClick={close}><Icon name="profile" size={16} />Profile</Link>
            {isAdmin && <Link href="/admin" className="nav-drop-link" onClick={close}><Icon name="admin" size={16} />Admin</Link>}
            <a href={logoutHref} className="nav-drop-link"><Icon name="signout" size={16} />Sign out</a>
          </div>
        </div>

        <Link href="/search" className="nav-link nav-search" aria-label="Search" onClick={close}>
          <Icon name="search" size={18} />
          <span className="nav-search-label">Search</span>
        </Link>
      </nav>
    </>
  );
}
