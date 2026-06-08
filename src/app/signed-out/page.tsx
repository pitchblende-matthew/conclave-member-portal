import Link from "next/link";
import Wordmark from "@/components/wordmark";

export const metadata = { title: "Signed out — Conclave" };

export default function SignedOut() {
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div style={{ marginBottom: "1.25rem" }}><Wordmark size={1.7} /></div>
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
