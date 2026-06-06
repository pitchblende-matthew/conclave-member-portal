import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import Wordmark from "@/components/wordmark";
import MemberNav from "@/components/member-nav";
import NotificationsBell, { type BellItem } from "@/components/notifications-bell";

export const dynamic = "force-dynamic";

type NotifRow = {
  id: number;
  type: string;
  topic_id: number | null;
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
      `SELECT n.id, n.type, n.topic_id, n.read_at, n.created_at,
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
        <NotificationsBell items={notifs.map(toItem)} unread={unread} />
      </header>
      <main className="page">{children}</main>
      <footer className="footer">Private. By invitation.</footer>
    </div>
  );
}
