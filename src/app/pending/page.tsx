import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import Wordmark from "@/components/wordmark";

export const dynamic = "force-dynamic";

export default async function Pending() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.status === "approved") redirect(user.onboarded === 1 ? "/dashboard" : "/onboarding");

  const declined = user.status === "declined";
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div style={{ marginBottom: "1.25rem" }}><Wordmark size={1.7} /></div>
        <h1>{declined ? "Request not approved" : "Request received"}</h1>
        <p className="meta">
          {declined
            ? "Your request to join wasn't approved. If you believe this is a mistake, reach out to whoever invited you."
            : "Thanks — your request is in. An admin will review it shortly. You'll get straight in once you're approved; you can sign back in any time to check."}
        </p>
        <p className="note" style={{ marginTop: "1.5rem" }}>
          Signed in as {user.email}. <a href={`${base}/logout`}>Sign out</a>
        </p>
      </div>
    </div>
  );
}
