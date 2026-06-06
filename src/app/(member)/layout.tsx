import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import Wordmark from "@/components/wordmark";
import MemberNav from "@/components/member-nav";

export const dynamic = "force-dynamic";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.status !== "approved") redirect("/pending");
  if (user.onboarded !== 1) redirect("/onboarding");

  return (
    <div className="shell">
      <header className="topbar">
        <Link href="/dashboard" className="wordmark-link">
          <Wordmark size={1.5} />
        </Link>
        <MemberNav
          isAdmin={user.is_admin === 1}
          logoutHref={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/logout`}
        />
      </header>
      <main className="page">{children}</main>
      <footer className="footer">Private. By invitation.</footer>
    </div>
  );
}
