import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="shell">
      <header className="topbar">
        <Link href="/dashboard" className="wordmark" style={{ textDecoration: "none", color: "inherit" }}>
          Conclave
        </Link>
        <nav className="member-nav">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/directory">Directory</Link>
          <Link href="/companies">Companies</Link>
          <Link href="/events">Events</Link>
          <Link href="/profile">Profile</Link>
          {user.is_admin === 1 && <Link href="/admin/invites">Invites</Link>}
          <a href={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/logout`}>Sign out</a>
        </nav>
      </header>
      <main className="page">{children}</main>
      <footer className="footer">Private. By invitation.</footer>
    </div>
  );
}
