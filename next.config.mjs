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
    },
  },
};

export default nextConfig;
