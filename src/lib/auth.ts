import { cookies } from "next/headers";
import { getDb } from "./db";
import { generateToken } from "./crypto";
import type { User } from "./types";

const COOKIE_NAME = "conclave_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

// Cookie path must match the app's mount path so it scopes correctly.
const COOKIE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "/";

export async function createSession(userId: number): Promise<void> {
  const token = generateToken(32);
  const expiresAt = Date.now() + MAX_AGE_SECONDS * 1000;
  await getDb()
    .prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(token, userId, expiresAt)
    .run();
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: COOKIE_PATH,
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (token) {
    await getDb().prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
  }
  jar.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: COOKIE_PATH,
    maxAge: 0,
  });
}

export async function getSessionUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const row = await getDb()
    .prepare(
      `SELECT u.* FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > ?`
    )
    .bind(token, Date.now())
    .first<User>();
  return row ?? null;
}

export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.is_admin !== 1) throw new Error("FORBIDDEN");
  return user;
}
