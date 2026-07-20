import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { generateToken } from "@/lib/crypto";
import { slackOAuthEnabled, slackAuthorizeUrl, getConfiguredTeamId } from "@/lib/slack";

export const dynamic = "force-dynamic";

const base = () => process.env.NEXT_PUBLIC_BASE_PATH || "";

// Start "Sign in with Slack": stash a CSRF state cookie, then bounce to Slack.
export async function GET() {
  const user = await getSessionUser();
  if (!user) return new Response(null, { status: 303, headers: { Location: `${base()}/login` } });
  if (!slackOAuthEnabled()) return new Response(null, { status: 303, headers: { Location: `${base()}/profile` } });

  const state = generateToken(24);
  const team = await getConfiguredTeamId();

  // Slack authorize is an absolute URL, so NextResponse.redirect is safe here and
  // lets us attach the state cookie to the redirect response.
  const res = NextResponse.redirect(slackAuthorizeUrl(state, team), 303);
  res.cookies.set("slack_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 600,
  });
  return res;
}
