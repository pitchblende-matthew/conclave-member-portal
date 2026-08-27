import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { mediaUrl } from "@/lib/media";
import { renderMarkdown } from "@/lib/markdown";
import Avatar from "@/components/avatar";
import LocalTime from "@/components/local-time";
import ConfirmSubmit from "@/components/confirm-submit";
import { getRequest, getResponses, categoryLabel } from "@/lib/requests";
import { toggleResolved, deleteRequest, deleteResponse } from "../actions";
import RespondForm from "./respond-form";

export const dynamic = "force-dynamic";

export default async function RequestDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const requestId = Number(id);
  const user = await requireUser();

  const req = await getRequest(requestId);
  if (!req) notFound();
  const responses = await getResponses(requestId);
  const canManage = user.is_admin === 1 || req.user_id === user.id;
  const ask = req.kind === "ask";

  return (
    <article style={{ maxWidth: 760, margin: "0 auto" }}>
      <p className="meta"><Link href="/requests">← Asks &amp; Offers</Link></p>

      <span style={{ display: "inline-flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
        <span className="market-tag" style={ask ? { background: "rgba(178,106,76,0.14)", color: "#985838" } : { background: "rgba(92,113,101,0.16)", color: "#45564b" }}>{ask ? "Ask" : "Offer"}</span>
        <span className="chip chip-static">{categoryLabel(req.category)}</span>
        {req.status !== "open" ? <span className="market-tag">Resolved</span> : null}
      </span>

      <div className="topline" style={{ marginTop: "0.5rem" }}>
        <h1 style={{ fontSize: "2.2rem" }}>{req.title}</h1>
        <div className="btn-row" style={{ alignItems: "center" }}>
          {canManage && (
            <>
              <form action={toggleResolved}>
                <input type="hidden" name="requestId" value={req.id} />
                <button className="btn btn-ghost inline-btn" type="submit">{req.status === "open" ? "Mark resolved" : "Reopen"}</button>
              </form>
              <form action={deleteRequest}>
                <input type="hidden" name="requestId" value={req.id} />
                <ConfirmSubmit className="btn btn-ghost inline-btn" message="Delete this post and its responses?">Delete</ConfirmSubmit>
              </form>
            </>
          )}
        </div>
      </div>

      <Link href={`/directory/${req.user_id}`} className="member-card-head" style={{ textDecoration: "none", color: "inherit", marginTop: "0.25rem" }}>
        <Avatar src={req.avatar_key ? mediaUrl(req.avatar_key) : null} name={req.author ?? ""} size={30} />
        <p className="meta" style={{ margin: 0 }}>{req.author || "Member"} · <LocalTime ms={req.created_at} /></p>
      </Link>

      {req.body.trim() ? <div className="prose" style={{ marginTop: "1rem" }} dangerouslySetInnerHTML={{ __html: renderMarkdown(req.body) }} /> : null}

      <h2 style={{ fontSize: "1.3rem", marginTop: "2rem" }}>
        {responses.length ? `Responses · ${responses.length}` : "Responses"}
      </h2>
      {responses.length === 0 ? (
        <p className="meta">No responses yet — {ask ? "help them out." : "take them up on it."}</p>
      ) : (
        <div style={{ marginTop: "0.75rem" }}>
          {responses.map((p) => {
            const canDelete = user.is_admin === 1 || p.user_id === user.id;
            return (
              <div key={p.id} className="card post">
                <div className="post-head">
                  <Link href={`/directory/${p.user_id}`} className="member-card-head" style={{ textDecoration: "none", color: "inherit" }}>
                    <Avatar src={p.avatar_key ? mediaUrl(p.avatar_key) : null} name={p.author ?? ""} size={34} />
                    <div>
                      <strong>{p.author || "Member"}</strong>
                      <p className="meta" style={{ margin: 0 }}><LocalTime ms={p.created_at} /></p>
                    </div>
                  </Link>
                  {canDelete && (
                    <form action={deleteResponse}>
                      <input type="hidden" name="responseId" value={p.id} />
                      <ConfirmSubmit className="link-danger" message="Delete this response?">Delete</ConfirmSubmit>
                    </form>
                  )}
                </div>
                <div className="post-body prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(p.body) }} />
              </div>
            );
          })}
        </div>
      )}

      {req.status === "open" ? (
        <div style={{ marginTop: "1.5rem" }}>
          <RespondForm requestId={req.id} kind={ask ? "ask" : "offer"} />
        </div>
      ) : (
        <p className="meta" style={{ marginTop: "1.5rem" }}>This post is marked resolved.</p>
      )}
    </article>
  );
}
