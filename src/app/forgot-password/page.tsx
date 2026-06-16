"use client";

import { useActionState } from "react";
import Link from "next/link";
import Wordmark from "@/components/wordmark";
import HearthGlow from "@/components/hearth-glow";
import { requestReset } from "./actions";

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(requestReset, {});
  return (
    <div className="auth-wrap">
      <HearthGlow />
      <div className="auth-logo"><Wordmark reverse size={2.2} /></div>
      <div className="auth-card">
        <div className="eyebrow">Members</div>
        <h1>Reset your password</h1>
        {state?.ok ? (
          <>
            <p className="meta">If that email is registered, we&apos;ve sent a link to reset your password. It expires in one hour.</p>
            <p className="note"><Link href="/login">Back to sign in</Link></p>
          </>
        ) : (
          <>
            <p className="meta">Enter your email and we&apos;ll send you a reset link.</p>
            <form action={formAction}>
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" autoComplete="email" required />
              {state?.error && <div className="error" role="alert">{state.error}</div>}
              <button className="btn" type="submit" disabled={pending}>
                {pending ? "Sending…" : "Send reset link"}
              </button>
            </form>
            <p className="note"><Link href="/login">Back to sign in</Link></p>
          </>
        )}
      </div>
    </div>
  );
}
