"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { signup } from "./actions";

function SignupForm() {
  const params = useSearchParams();
  const invite = params.get("invite") ?? "";
  const [state, formAction, pending] = useActionState(signup, {});
  return (
    <div className="auth-card">
      <div className="eyebrow">Conclave · By invitation</div>
      <h1>Create your account</h1>
      <p className="meta">Curated, deliberately small. Set up your access below.</p>
      <form action={formAction}>
        <input type="hidden" name="invite" defaultValue={invite} />
        <label htmlFor="name">Name</label>
        <input id="name" name="name" type="text" autoComplete="name" required />
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
        {!invite && (
          <>
            <label htmlFor="invite">Invitation code</label>
            <input id="invite" name="invite" type="text" placeholder="Required unless you're the first member" />
          </>
        )}
        {state?.error && <div className="error">{state.error}</div>}
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create account"}
        </button>
      </form>
      <p className="note">
        Already a member? <Link href="/login">Sign in</Link>.
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="auth-wrap">
      <Suspense fallback={<div className="auth-card">Loading…</div>}>
        <SignupForm />
      </Suspense>
    </div>
  );
}
