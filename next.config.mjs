import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Lets `next dev` talk to the Cloudflare bindings (D1, etc.) during local dev.
initOpenNextCloudflareForDev();

// Webflow Cloud serves the app behind a proxy: the browser's `origin` is your
// public domain (e.g. *.webflow.io or your mapped custom domain) while the
// request reaches the app with an internal `x-forwarded-host`
// (*.cosmic.webflow.services). Next.js blocks Server Actions when those differ,
// so list the trusted public origins here. Add your production/custom domain
// when you map one — or set SERVER_ACTIONS_ALLOWED_ORIGINS (comma-separated).
const allowedOrigins = [
  "the-conclave-0806c8.webflow.io",
  "*.webflow.io",
  "*.cosmic.webflow.services",
  // Mapped production domain(s). Server Actions are rejected when the request's
  // origin isn't trusted, so the live custom domain must be listed here.
  "jointheconclave.com",
  "www.jointheconclave.com",
  ...(process.env.SERVER_ACTIONS_ALLOWED_ORIGINS
    ? process.env.SERVER_ACTIONS_ALLOWED_ORIGINS.split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : []),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // IMPORTANT: this must match the mount path of your Webflow Cloud environment.
  // If you mount the app at https://yoursite.com/portal  -> set NEXT_PUBLIC_BASE_PATH=/portal
  // If you deploy to a root domain                       -> leave it unset.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
  reactStrictMode: true,
  experimental: {
    serverActions: {
      allowedOrigins,
      // Profile photos / company logos post through Server Actions; media.ts
      // allows images up to 5 MB. Keep a generous margin above that (multipart
      // overhead + slightly-over files) so an oversized upload reaches the
      // handler and gets a friendly "5 MB or smaller" error instead of being
      // rejected by the framework as an unhandled 500.
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
