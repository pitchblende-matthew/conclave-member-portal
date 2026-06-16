"use client";

import { useState } from "react";

type Theme = "light" | "dark";

// Light/dark switch for the member portal. The server renders the correct theme
// class on #app-shell from the `theme` cookie (no flash); this toggles it live
// and persists the choice back to the cookie.
export default function ThemeToggle({ initial }: { initial: Theme }) {
  const [theme, setTheme] = useState<Theme>(initial);

  function apply(next: Theme) {
    setTheme(next);
    document.cookie = `theme=${next}; path=/; max-age=31536000; samesite=lax`;
    const el = document.getElementById("app-shell");
    if (el) {
      el.classList.toggle("app-dark", next === "dark");
      el.classList.toggle("app-light", next === "light");
    }
  }

  const dark = theme === "dark";
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => apply(dark ? "light" : "dark")}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
    >
      {dark ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  );
}
