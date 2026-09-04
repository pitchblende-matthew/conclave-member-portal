import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth";
import { exchangeSlackCode, linkSlack, getConfiguredTeamId } from "@/lib/slack";
import { mountPath } from "@/lib/base-path";

export const dynamic = "force-dynamic";

const base = () => mountPath();

// Relative redirect (per the logout route: absolute URLs break behind the
// Webflow Cloud proxy) that also clears the one-time state cookie.
function backTo(path: string, clearState = true): Response {
  const headers = new Headers({ Location: `${base()}${path}` });
  if (clearState) {
    headers.append("Set-Cookie", "slack_oauth_state=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax");
  }
  return new Response(null, { status: 303, headers });
}

// Finish "Sign in with Slack": verify state, exchange the code, and link the
// member's Slack identity to their account.
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return backTo("/login", false);

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = (await cookies()).get("slack_oauth_state")?.value;

  if (url.searchParams.get("error")) return backTo("/profile?slack=denied");
  if (!code || !state || !cookieState || state !== cookieState) return backTo("/profile?slack=error");

  const identity = await exchangeSlackCode(code);
  if (!identity) return backTo("/profile?slack=error");

  // If an admin configured the workspace team id, only accept accounts in it.
  const team = await getConfiguredTeamId();
  if (team && identity.teamId && identity.teamId !== team) return backTo("/profile?slack=wrongteam");

  await linkSlack(user.id, identity.userId, identity.teamId);
  return backTo("/profile?slack=connected");
}
