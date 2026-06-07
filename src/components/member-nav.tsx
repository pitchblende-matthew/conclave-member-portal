"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Icon from "@/components/icons";

// Responsive member navigation: grouped menus on desktop (a "Network" and an
// "Account" dropdown keep the bar uncluttered), and a single hamburger panel on
// mobile where every link is shown expanded.
export default function MemberNav({ isAdmin, logoutHref, unreadMessages = 0 }: { isAdmin: boolean; logoutHref: string; unreadMessages?: number }) {
  const [open, setOpen] = useState(false); // mobile panel
  const [menu, setMenu] = useState<string | null>(null); // open desktop dropdown
  const pathname = usePathname();

  const close = () => { setOpen(false); setMenu(null); };
  const toggleMenu = (name: string) => setMenu((m) => (m === name ? null : name));
  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname === href || pathname.startsWith(`${href}/`);
  const groupActive = (hrefs: string[]) => hrefs.some(isActive);

  // Mark the current link for assistive tech + styling.
  const linkProps = (href: string) => ({
    href,
    className: `nav-link${isActive(href) ? " active" : ""}`,
    "aria-current": (isActive(href) ? "page" : undefined) as "page" | undefined,
    onClick: close,
  });

  return (
    <>
      <button
        type="button"
        className="nav-toggle"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="member-nav"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="nav-toggle-icon" aria-hidden>{open ? "✕" : "☰"}</span>
      </button>

      <nav
        id="member-nav"
        aria-label="Primary"
        className={`member-nav${open ? " open" : ""}`}
        onKeyDown={(e) => { if (e.key === "Escape") { setMenu(null); setOpen(false); } }}
      >
        <Link {...linkProps("/dashboard")}><Icon name="dashboard" size={16} />Dashboard</Link>

        <div className={`nav-group${menu === "community" ? " open" : ""}`}>
          <button
            type="button"
            className={`nav-link nav-group-btn${groupActive(["/board", "/events", "/briefings"]) ? " active" : ""}`}
            aria-expanded={menu === "community"}
            aria-haspopup="true"
            onClick={() => toggleMenu("community")}
          >
            <Icon name="board" size={16} />Community <span className="caret" aria-hidden>▾</span>
          </button>
          <div className="nav-dropdown">
            <Link href="/board" className="nav-drop-link" onClick={close}><Icon name="board" size={16} />Board</Link>
            <Link href="/events" className="nav-drop-link" onClick={close}><Icon name="events" size={16} />Events</Link>
            <Link href="/briefings" className="nav-drop-link" onClick={close}><Icon name="briefings" size={16} />Briefings</Link>
          </div>
        </div>

        <div className={`nav-group${menu === "network" ? " open" : ""}`}>
          <button
            type="button"
            className={`nav-link nav-group-btn${groupActive(["/directory", "/companies", "/industries", "/connections", "/messages"]) ? " active" : ""}`}
            aria-expanded={menu === "network"}
            aria-haspopup="true"
            onClick={() => toggleMenu("network")}
          >
            <Icon name="members" size={16} />Network <span className="caret" aria-hidden>▾</span>
          </button>
          <div className="nav-dropdown">
            <Link href="/directory" className="nav-drop-link" onClick={close}><Icon name="members" size={16} />Members</Link>
            <Link href="/companies" className="nav-drop-link" onClick={close}><Icon name="companies" size={16} />Companies</Link>
            <Link href="/industries" className="nav-drop-link" onClick={close}><Icon name="categories" size={16} />Industries</Link>
            <Link href="/connections" className="nav-drop-link" onClick={close}><Icon name="connections" size={16} />Connections</Link>
            <Link href="/messages" className="nav-drop-link" onClick={close}>
              <Icon name="message" size={16} />Messages
              {unreadMessages > 0 ? <span className="nav-badge" aria-label={`${unreadMessages} unread`}>{unreadMessages > 9 ? "9+" : unreadMessages}</span> : null}
            </Link>
          </div>
        </div>

        <div className={`nav-group${menu === "account" ? " open" : ""}`}>
          <button
            type="button"
            className={`nav-link nav-group-btn${groupActive(["/profile", "/admin"]) ? " active" : ""}`}
            aria-expanded={menu === "account"}
            aria-haspopup="true"
            onClick={() => toggleMenu("account")}
          >
            <Icon name="profile" size={16} />Account <span className="caret" aria-hidden>▾</span>
          </button>
          <div className="nav-dropdown">
            <Link href="/profile" className="nav-drop-link" onClick={close}><Icon name="profile" size={16} />Profile</Link>
            {isAdmin && <Link href="/admin" className="nav-drop-link" onClick={close}><Icon name="admin" size={16} />Admin</Link>}
            <a href={logoutHref} className="nav-drop-link"><Icon name="signout" size={16} />Sign out</a>
          </div>
        </div>

        <Link href="/search" className={`nav-link nav-search${isActive("/search") ? " active" : ""}`} aria-label="Search" aria-current={isActive("/search") ? "page" : undefined} onClick={close}>
          <Icon name="search" size={18} />
          <span className="nav-search-label">Search</span>
        </Link>
      </nav>
    </>
  );
}
