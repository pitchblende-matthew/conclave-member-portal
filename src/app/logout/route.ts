import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await destroySession();
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  return NextResponse.redirect(new URL(`${base}/login`, request.url));
}
