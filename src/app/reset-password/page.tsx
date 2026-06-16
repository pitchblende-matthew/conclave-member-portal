"use client";

import { Suspense } from "react";
import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Wordmark from "@/components/wordmark";
import HearthGlow from "@/components/hearth-glow";
import { resetPassword } from "./actions";

function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const [state, formAction, pending] = useActionState(resetPassword, {});

  return (
    <div className="auth-card">
      <div className="eyebrow">Members</div>
      <h1>Choose a new password</h1>
      {state?.ok ? (
        <>
          <p className="meta">Your password has been updated. You can now sign in.</p>
          <p className="note"><Link href="/login">Go to sign in</Link></p>
        </>
      ) : !token ? (
        <>
          <p className="meta">This reset link is missing or invalid.</p>
          <p className="note"><Link href="/forgot-password">Request a new link</Link></p>
        </>
      ) : (
        <form action={formAction}>
          <input type="hidden" name="token" value={token} />
          <label htmlFor="password">New password</label>
          <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
          <label htmlFor="confirm">Confirm password</label>
          <input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={8} />
          {state?.error && <div className="error" role="alert">{state.error}</div>}
          <button className="btn" type="submit" disabled={pending}>
            {pending ? "Updating…" : "Update password"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="auth-wrap">
      <HearthGlow />
      <div className="auth-logo"><Wordmark reverse size={2.2} /></div>
      <Suspense fallback={<div className="auth-card">Loading…</div>}>
        <ResetForm />
      </Suspense>
    </div>
  );
}
