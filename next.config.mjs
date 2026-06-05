import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Lets `next dev` talk to the Cloudflare bindings (D1, etc.) during local dev.
initOpenNextCloudflareForDev();

/** @type {import('next').NextConfig} */
const nextConfig = {
  // IMPORTANT: this must match the mount path of your Webflow Cloud environment.
  // If you mount the app at https://yoursite.com/portal  -> set NEXT_PUBLIC_BASE_PATH=/portal
  // If you deploy to a root domain                       -> leave it unset.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
  reactStrictMode: true,
};

export default nextConfig;
