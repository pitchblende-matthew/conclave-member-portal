"use client";

import { useActionState } from "react";
import Link from "next/link";
import Wordmark from "@/components/wordmark";
import { login } from "./actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, {});
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div style={{ marginBottom: "1.25rem" }}><Wordmark size={1.7} /></div>
        <div className="eyebrow">Members</div>
        <h1>Sign in</h1>
        <p className="meta">Welcome back. Enter your details to continue.</p>
        <form action={formAction}>
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required />
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required />
          {state?.error && <div className="error">{state.error}</div>}
          <button className="btn" type="submit" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="note">
          Have an invitation? <Link href="/signup">Create your account</Link>.
        </p>
      </div>
    </div>
  );
}
