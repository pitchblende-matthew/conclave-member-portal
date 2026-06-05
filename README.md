# Conclave — Member Portal

A starter full-stack app for the Conclave members area, built to deploy on **Webflow Cloud**
(Next.js on the Cloudflare edge, with a Webflow Cloud **SQLite/D1** database).

It includes:

- **Email + password auth** — login, invite-only signup, sessions, sign out
- **Gated member area** — every page under `(member)/` requires a valid session
- **Member directory** — everyone in the network
- **Events + RSVPs** — members RSVP / cancel; live attendee counts
- **Editable profiles** — each member edits their own details (shown in the directory)
- **Admin invitations** — admins generate one-time invite links

> This is a reviewed **starting point**, not a hardened production system. See
> "Before you go live" at the bottom.

---

## How it fits together

| Piece | Where |
|---|---|
| Framework config for Webflow Cloud | `webflow.json` (`framework: next`) |
| Cloudflare bindings (the database) | `wrangler.json` → `d1_databases` binding named `DB` |
| Database schema | `migrations/0001_init.sql` (auto-applied on deploy) |
| Auth (sessions, cookies) | `src/lib/auth.ts` |
| Password hashing (edge-safe) | `src/lib/crypto.ts` (Web Crypto PBKDF2) |
| DB access | `src/lib/db.ts` (`getCloudflareContext().env.DB`) |
| Public pages | `src/app/login`, `src/app/signup`, `src/app/logout` |
| Gated pages | `src/app/(member)/…` (dashboard, directory, events, profile, admin) |

---

## The mount path (important)

A Webflow Cloud environment is mounted at a URL path — e.g. `https://yoursite.com/portal`.
Next.js must know that path via **`basePath`**, which this app reads from `NEXT_PUBLIC_BASE_PATH`.

- Mounting at `…/portal` → set `NEXT_PUBLIC_BASE_PATH=/portal`
- Deploying to a **root domain** → leave it unset

Set it in **two** places so local and production match:
1. Local: `.dev.vars` (copy from `.dev.vars.example`)
2. Production: your Webflow Cloud **Environment → Variables**

The session cookie is scoped to this same path automatically.

---

## Run it locally

```bash
npm install

# create your local env file
cp .dev.vars.example .dev.vars       # then edit NEXT_PUBLIC_BASE_PATH if needed

# create the local database tables
npm run db:migrate:local

# start the dev server (talks to a local D1 via the OpenNext adapter)
npm run dev
```

For an exact production-runtime preview (Cloudflare Workers), use:

```bash
npm run preview
```

---

## Deploy to Webflow Cloud (GitHub)

1. Push this project to a **GitHub repository**.
2. In Webflow: **Site settings → Webflow Cloud** → install the GitHub App and grant access to the repo.
3. **Create a project** pointing at the repo.
4. **Create an environment**:
   - **Branch**: e.g. `main`
   - **Mount path**: e.g. `/portal` (must match `NEXT_PUBLIC_BASE_PATH`)
5. Add the environment variable **`NEXT_PUBLIC_BASE_PATH`** = your mount path.
6. **Publish your Webflow site once** (environments don't go live until the site is published).
7. **Push to the branch.** Webflow Cloud builds, **auto-applies the migrations** in `migrations/`,
   provisions the `DB` database, and deploys. Every future push redeploys.

Your portal is then live at `https://yoursite.com<mount-path>` (e.g. `/portal`).

---

## First-run bootstrap (creating the first admin)

Signup is invite-only — but invites can only be made by an admin, so there's a bootstrap rule:

- **The very first person to sign up needs no invite and is made an admin.**
- After that, everyone needs a one-time invite code.

So: deploy → visit `…/portal/signup` → create your account (you become admin) →
go to **Invites** in the nav → generate invitation links → share them. New members open the
link (`…/signup?invite=CODE`) and the code is consumed on signup.

---

## Match the Conclave look

The app ships with the Conclave palette and fonts (cream/sage/ink, Cormorant + Inter) in
`src/app/globals.css`. To make it pixel-match the marketing site, you can pull your existing
Webflow components into the app with **DevLink** and replace the plain markup here.

---

## Before you go live (hardening checklist)

This scaffold covers the core flow but intentionally leaves these to you / a developer:

- **Password reset / email verification** — not included; add an email provider + token flow.
- **Rate limiting** on login/signup (e.g. a KV-backed limiter) to slow brute force.
- **Invite expiry** — invites currently never expire; add an `expires_at` if you want.
- **Input validation** — basic checks only; tighten as needed.
- **Session rotation / revocation UI**, "log out everywhere", etc.
- **Review the auth code** (`src/lib/auth.ts`, `src/lib/crypto.ts`) before trusting it with real members.
- **basePath note**: if after login a redirect lands on the wrong path, adjust the
  `redirect("/…")` targets in the `actions.ts` files to include your mount path.

---

Built to deploy on Webflow Cloud. Frameworks supported there today: Next.js and Astro.
