"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Wordmark from "@/components/wordmark";
import { US_STATES } from "@/lib/us-states";
import { signup } from "./actions";

function SignupForm() {
  const params = useSearchParams();
  const invite = params.get("invite") ?? "";
  const [state, formAction, pending] = useActionState(signup, {});
  return (
    <div className="auth-card">
      <div style={{ marginBottom: "1.25rem" }}><Wordmark size={1.7} /></div>
      <div className="eyebrow">By invitation</div>
      <h1>Request access</h1>
      <p className="meta">
        {invite
          ? "You've been invited — set up your account below."
          : "Tell us who you are. New requests are reviewed before approval; an invite code from a member gets you in immediately."}
      </p>
      <form action={formAction}>
        {invite && <input type="hidden" name="invite" defaultValue={invite} />}
        <label htmlFor="name">Name</label>
        <input id="name" name="name" type="text" autoComplete="name" required />
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
        <div className="field-grid">
          <div>
            <label htmlFor="city">City</label>
            <input id="city" name="city" type="text" autoComplete="address-level2" required />
          </div>
          <div>
            <label htmlFor="state">State</label>
            <select id="state" name="state" defaultValue="" autoComplete="address-level1" required>
              <option value="" disabled>Choose…</option>
              {US_STATES.map((s) => (
                <option key={s.abbr} value={s.abbr}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="zip">ZIP code</label>
            <input id="zip" name="zip" type="text" inputMode="numeric" pattern="\d{5}" maxLength={5} autoComplete="postal-code" required />
          </div>
        </div>
        <p className="note" style={{ marginTop: "-0.25rem" }}>
          We use this to connect you with members and businesses in your media market.
        </p>
        <label htmlFor="company">Company</label>
        <input id="company" name="company" type="text" autoComplete="organization" />
        <label htmlFor="role">Title</label>
        <input id="role" name="role" type="text" autoComplete="organization-title" />
        <label htmlFor="linkedin">LinkedIn</label>
        <input id="linkedin" name="linkedin" type="text" placeholder="https://linkedin.com/in/…" />
        {!invite && (
          <>
            <label htmlFor="invite">Invitation code (optional)</label>
            <input id="invite" name="invite" type="text" placeholder="Skips the review if you have one" />
          </>
        )}
        {state?.error && <div className="error" role="alert">{state.error}</div>}
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Submitting…" : "Request access"}
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
