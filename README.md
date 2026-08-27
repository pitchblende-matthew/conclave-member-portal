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

## Marketing-site event pages (Webflow CMS sync)

Approved, upcoming events are mirrored into a Webflow **CMS collection** ("Events"), so each
one gets its own page on the marketing site at `jointheconclave.com/event/{slug}` — designed
once as a Collection Page template. The portal is the source of truth; the sync is one-way.

- **Sync engine:** `src/lib/webflow-sync.ts` — creates / updates / removes CMS items to match
  events where `status = 'approved'` and `starts_at` is in the future. Idempotent via
  `events.webflow_item_id`; it skips unchanged items using a content hash.
- **Trigger:** `GET /api/webflow/sync?key=<WEBFLOW_SYNC_SECRET>`. Webflow Cloud has no cron,
  so point the **same external scheduler** used for the digest at this URL (every 10–15 min).
- **Config (Webflow Cloud → Environment variables):**
  - `WEBFLOW_API_TOKEN` — a Webflow **site API token** with CMS read/write scope.
  - `WEBFLOW_EVENTS_COLLECTION_ID` — the Events collection id.
  - `WEBFLOW_SYNC_SECRET` — any random string; guards the endpoint.
  - (`EMAIL_BASE_URL` is reused to build the per-event RSVP deep link into the portal.)

  With the first two unset, the sync safely no-ops. Run `db:migrate:remote` so the
  `webflow_item_id` columns (migration `0036`) exist before enabling it.

---

## Briefings from pitchblende.net (Insights sync)

New posts on **pitchblende.net/insights** are imported into the **briefings** section
as published "link" briefings, filed under the closest topic. Pitchblende's Webflow CMS
is the source of truth; the sync is one-way and **insert-only** (keyed by post URL), so
admin edits and unpublishing stick. Migration `0040` backfills the current posts;
the sync keeps it current going forward.

- **Sync engine:** `src/lib/briefings-sync.ts` — reads the Pitchblende "Blog Posts"
  collection and inserts any post not already briefed.
- **Trigger:** `GET /api/briefings/sync?key=<WEBFLOW_SYNC_SECRET>` (shares the events
  sync's secret). Scheduled daily by `.github/workflows/briefings-sync.yml`.
- **Config (Webflow Cloud → Environment variables):**
  - `PITCHBLENDE_WEBFLOW_TOKEN` — a Webflow API token with **read** access to the
    pitchblende.net site. Falls back to `WEBFLOW_API_TOKEN` if that token can read it
    (e.g. a workspace-scoped token).
  - `WEBFLOW_SYNC_SECRET` — the same secret used by the events sync.

  With no token, the sync safely no-ops.

---

## Event emails (announcements + reminders)

When an event is added, the network gets an announcement email; RSVP'd attendees
then get reminders **~1 month / 1 week / 3 days / 1 day** before it.

- **Runner:** `src/lib/event-emails.ts` — announces newly-added approved events
  to opted-in members, and sends the four reminder windows to attendees. Every
  send is idempotent (`event_email_log`, one row per event + kind), so extra
  runs never double-send. No-ops when email isn't configured.
- **Trigger:** `GET /api/events/notify/run?key=<DIGEST_SECRET>` — reuses the
  digest secret and the existing `RESEND_API_KEY` / `EMAIL_FROM` config, so
  there's **nothing new to set up** beyond the digest's env. Scheduled every 3h
  by `.github/workflows/event-emails.yml`.
- **Opt-out:** members toggle "event emails" in their profile, or one-click
  unsubscribe (`/api/events/unsubscribe`) from any event email — tracked in
  `users.event_opt_out`, independent of the weekly digest.

Migration `0045` adds the log + opt-out column and marks existing events as
already-announced (so no retroactive blast on first deploy; their reminders
still fire).

---

## Warm intros ("The Handshake")

Once a month, opted-in members are paired 1:1 and each gets an email introducing
their match (name, role, a line of bio, a reason, and links to the profile /
DMs). The matcher avoids recent repeats and prefers same-market pairs so they
can meet in person; an odd member out joins one pair as a trio so no one is left
out.

- **Runner:** `src/lib/intros.ts` — pairs eligible members and emails them.
  Idempotent per month (keyed by the `YYYY-MM` round in `intro_pairs`).
- **Trigger:** `GET /api/intros/run?key=<DIGEST_SECRET>` (add `&force=1` to
  re-pair the current month — it re-sends). Scheduled on the 1st of each month
  by `.github/workflows/intros.yml`. Reuses the digest secret + email config —
  **no new env**.
- **Opt-out:** a profile toggle + one-click `/api/intros/unsubscribe`, tracked
  in `users.intro_opt_out`.

Migration `0047` adds `intro_pairs` + the opt-out column.

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
