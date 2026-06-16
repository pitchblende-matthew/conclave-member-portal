import Link from "next/link";
import Wordmark from "@/components/wordmark";
import HearthGlow from "@/components/hearth-glow";

export const metadata = { title: "Signed out — Conclave" };

export default function SignedOut() {
  return (
    <div className="auth-wrap">
      <HearthGlow />
      <div className="auth-logo"><Wordmark reverse size={2.2} /></div>
      <div className="auth-card">
        <div className="eyebrow">Members</div>
        <h1>You&apos;ve been signed out</h1>
        <p className="meta">Your session has ended on this device. See you again soon.</p>
        <Link
          href="/login"
          className="btn"
          style={{ display: "block", textAlign: "center", textDecoration: "none", marginTop: "1.5rem" }}
        >
          Sign back in
        </Link>
      </div>
    </div>
  );
}
