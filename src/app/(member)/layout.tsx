import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import Wordmark from "@/components/wordmark";
import MemberNav from "@/components/member-nav";
import NotificationsBell, { type BellItem } from "@/components/notifications-bell";
import ThemeToggle from "@/components/theme-toggle";
import FeedbackWidget from "./_feedback/feedback-widget";
import { unreadMessageCount } from "@/lib/messages";
import { mountPath } from "@/lib/base-path";

export const dynamic = "force-dynamic";

type NotifRow = {
  id: number;
  type: string;
  topic_id: number | null;
  actor_id: number | null;
  read_at: number | null;
  created_at: number;
  actor_name: string | null;
  topic_title: string | null;
};

function toItem(n: NotifRow): BellItem {
  const who = n.actor_name || "A member";
  let text = "";
  let href = "/dashboard";
  switch (n.type) {
    case "connection_request":
      text = `${who} sent you a connection request`;
      href = "/connections";
      break;
    case "connection_accepted":
      text = `${who} accepted your connection request`;
      href = "/connections";
      break;
    case "topic_reply":
      text = n.topic_title ? `${who} replied in “${n.topic_title}”` : `${who} replied to your topic`;
      href = n.topic_id ? `/board/${n.topic_id}` : "/board";
      break;
    case "event_submitted":
      text = `${who} submitted an event for review`;
      href = "/admin/events";
      break;
    case "event_approved":
      text = "Your event submission was approved";
      href = "/events";
      break;
    case "event_declined":
      text = "Your event submission wasn’t approved";
      href = "/events";
      break;
    case "briefing_submitted":
      text = `${who} submitted a briefing for review`;
      href = "/admin/briefings";
      break;
    case "briefing_approved":
      text = "Your briefing was approved and published";
      href = "/briefings";
      break;
    case "briefing_declined":
      text = "Your briefing submission wasn’t approved";
      href = "/briefings";
      break;
    case "message":
      text = `${who} sent you a message`;
      href = n.actor_id ? `/messages/${n.actor_id}` : "/messages";
      break;
    case "content_reported":
      text = `${who} reported content`;
      href = "/admin/reports";
      break;
    case "invite_request":
      text = "New invitation request from the site";
      href = "/admin/requests";
      break;
    case "feedback":
      text = `${who} sent alpha feedback`;
      href = "/admin/feedback";
      break;
    case "feedback_reply":
      text = "The team replied to your feedback";
      href = "/feedback";
      break;
    // Reuses topic_id to carry the request id (see requests/actions.ts).
    case "request_response":
      text = `${who} responded to your post`;
      href = n.topic_id ? `/requests/${n.topic_id}` : "/requests";
      break;
    case "intros_ready":
      text = "This month's member intros are ready to review";
      href = "/admin/intros";
      break;
    default:
      text = "New activity";
  }
  return { id: n.id, href, text, created_at: n.created_at, read: n.read_at !== null };
}

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.status !== "approved") redirect("/pending");
  if (user.onboarded !== 1) redirect("/onboarding");

  const db = getDb();
  const { results: notifs } = await db
    .prepare(
      `SELECT n.id, n.type, n.topic_id, n.actor_id, n.read_at, n.created_at,
              a.name AS actor_name, t.title AS topic_title
       FROM notifications n
       LEFT JOIN users a ON a.id = n.actor_id
       LEFT JOIN topics t ON t.id = n.topic_id
       WHERE n.user_id = ?
       ORDER BY n.created_at DESC LIMIT 12`
    )
    .bind(user.id)
    .all<NotifRow>();
  const unread = notifs.filter((n) => n.read_at === null).length;
  const unreadMessages = await unreadMessageCount(user.id);

  // Theme preference (defaults to dark); rendered server-side so there's no flash.
  const theme = (await cookies()).get("theme")?.value === "light" ? "light" : "dark";

  return (
    <div id="app-shell" className={theme === "dark" ? "app-dark" : "app-light"}>
      <div className="shell">
        <a href="#main" className="skip-link">Skip to content</a>
        <header className="topbar">
          <Link href="/dashboard" className="wordmark-link" aria-label="Conclave — dashboard">
            <Wordmark size={1.5} />
          </Link>
          <MemberNav
            isAdmin={user.is_admin === 1}
            unreadMessages={unreadMessages}
            logoutHref={`${mountPath()}/logout`}
          />
          <ThemeToggle initial={theme} />
          <NotificationsBell items={notifs.map(toItem)} unread={unread} />
        </header>
        <main id="main" className="page" tabIndex={-1}>{children}</main>
        <footer className="footer">
          {/* Plain anchors (not next/link) so these resolve to the marketing site at the
              domain root rather than under the portal's /portal base path. */}
          <nav className="footer-nav" aria-label="The Conclave">
            <a href="/">The Conclave</a>
            <a href="/about">About</a>
            <a href="mailto:hello@jointheconclave.com">Contact</a>
          </nav>
          <span className="footer-tag">Private. By invitation.</span>
        </footer>
        {user.alpha_tester === 1 && <FeedbackWidget />}
      </div>
    </div>
  );
}
