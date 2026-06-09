import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { listFeedback, feedbackStatusLabel, friendlyUserAgent, FEEDBACK_STATUSES } from "@/lib/feedback";
import { mediaUrl } from "@/lib/media";
import LocalTime from "@/components/local-time";
import ConfirmSubmit from "@/components/confirm-submit";
import { updateFeedbackStatus, removeFeedback, replyFeedback } from "./actions";

export const dynamic = "force-dynamic";

const KINDS = [
  { value: "bug", label: "Bug" },
  { value: "feature", label: "Feature" },
];

export default async function AdminFeedback({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; kind?: string }>;
}) {
  const me = await requireUser();
  if (me.is_admin !== 1) redirect("/dashboard");

  const { status, kind } = await searchParams;
  const activeStatus = FEEDBACK_STATUSES.some((s) => s.value === status) ? status! : "all";
  const activeKind = KINDS.some((k) => k.value === kind) ? kind! : "all";

  const items = await listFeedback({ status: activeStatus, kind: activeKind });

  const href = (over: { status?: string; kind?: string }) => {
    const sp = new URLSearchParams();
    const s = over.status ?? activeStatus;
    const k = over.kind ?? activeKind;
    if (s !== "all") sp.set("status", s);
    if (k !== "all") sp.set("kind", k);
    const q = sp.toString();
    return q ? `/admin/feedback?${q}` : "/admin/feedback";
  };

  return (
    <>
      <p className="meta"><Link href="/admin">← Admin</Link></p>
      <div className="tag">Admin · Feedback</div>
      <h1 style={{ fontSize: "2.6rem" }}>Alpha feedback</h1>
      <p className="meta">Bug reports and feature requests from alpha testers.</p>

      <nav className="chip-row" style={{ marginTop: "0.9rem" }} aria-label="Filter by status">
        <Link href={href({ status: "all" })} className={`chip${activeStatus === "all" ? " chip-active" : ""}`}>All status</Link>
        {FEEDBACK_STATUSES.map((s) => (
          <Link key={s.value} href={href({ status: s.value })} className={`chip${activeStatus === s.value ? " chip-active" : ""}`}>{s.label}</Link>
        ))}
      </nav>
      <nav className="chip-row" style={{ marginTop: "0.5rem" }} aria-label="Filter by kind">
        <Link href={href({ kind: "all" })} className={`chip${activeKind === "all" ? " chip-active" : ""}`}>All kinds</Link>
        {KINDS.map((k) => (
          <Link key={k.value} href={href({ kind: k.value })} className={`chip${activeKind === k.value ? " chip-active" : ""}`}>{k.label}</Link>
        ))}
      </nav>

      <div style={{ marginTop: "1.5rem" }}>
        {items.map((f) => {
          const resolved = f.status === "closed";
          const ua = friendlyUserAgent(f.user_agent);
          return (
            <div key={f.id} className="card" style={resolved ? { opacity: 0.6 } : undefined}>
              <div className="tag">
                {f.kind === "bug" ? "Bug" : "Feature"} · <LocalTime ms={f.created_at} />
                <span className="market-tag" style={{ marginLeft: "0.6rem" }}>{feedbackStatusLabel(f.status)}</span>
              </div>
              <p style={{ margin: "0.4rem 0 0.5rem", whiteSpace: "pre-wrap" }}>{f.body}</p>
              {f.screenshot_key ? (
                <a href={mediaUrl(f.screenshot_key)} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginBottom: "0.5rem" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mediaUrl(f.screenshot_key)} alt="Screenshot" className="feedback-shot" />
                </a>
              ) : null}
              <p className="meta" style={{ margin: 0 }}>
                {f.author || "A member"}
                {f.page ? <> · <Link href={f.page}>{f.page}</Link></> : null}
                {ua ? <> · <span title={f.user_agent}>{ua}</span></> : null}
              </p>

              {f.admin_reply ? (
                <div className="feedback-reply">
                  <span className="feedback-reply-label">Your reply</span>
                  <p style={{ margin: "0.2rem 0 0", whiteSpace: "pre-wrap" }}>{f.admin_reply}</p>
                </div>
              ) : null}

              <form action={replyFeedback} style={{ marginTop: "0.85rem" }}>
                <input type="hidden" name="id" value={f.id} />
                <textarea name="reply" defaultValue={f.admin_reply} placeholder="Reply to the tester…" style={{ minHeight: "56px" }} />
                <button className="btn btn-ghost inline-btn" type="submit" style={{ marginTop: "0.5rem" }}>
                  {f.admin_reply ? "Update reply" : "Send reply"}
                </button>
              </form>

              <div className="btn-row" style={{ marginTop: "0.85rem", alignItems: "center" }}>
                <form action={updateFeedbackStatus} className="inline-form">
                  <input type="hidden" name="id" value={f.id} />
                  <select name="status" defaultValue={f.status} aria-label="Status" style={{ width: "auto" }}>
                    {FEEDBACK_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  <button className="btn btn-ghost inline-btn" type="submit">Update</button>
                </form>
                <form action={removeFeedback}>
                  <input type="hidden" name="id" value={f.id} />
                  <ConfirmSubmit className="btn btn-ghost inline-btn" message="Delete this feedback?">Delete</ConfirmSubmit>
                </form>
              </div>
            </div>
          );
        })}
        {items.length === 0 && <p className="meta">No feedback matches this filter.</p>}
      </div>
    </>
  );
}
