import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { loadEnv } from "./env";

export const SESSION_COOKIE = "bic_session";
const SESSION_TTL_SECONDS = 12 * 60 * 60; // 12 hours

interface SessionPayload {
  sub: string;
  exp: number; // unix seconds
}

function base64url(input: string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

/** Constant-time string comparison that tolerates differing lengths. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** Verify the intake shared secret from an `Authorization: Bearer <secret>` header. */
export function verifyIntakeAuth(authorizationHeader: string | null): boolean {
  const env = loadEnv();
  if (!authorizationHeader?.startsWith("Bearer ")) return false;
  const presented = authorizationHeader.slice("Bearer ".length).trim();
  return safeEqual(presented, env.INTAKE_SHARED_SECRET);
}

/** Verify the reviewer dashboard password. */
export function verifyDashboardPassword(password: string): boolean {
  const env = loadEnv();
  return safeEqual(password, env.DASHBOARD_PASSWORD);
}

/** Create a signed session token (HMAC over the payload). */
export function createSessionToken(now: Date = new Date()): string {
  const env = loadEnv();
  const payload: SessionPayload = {
    sub: "reviewer",
    exp: Math.floor(now.getTime() / 1000) + SESSION_TTL_SECONDS,
  };
  const body = base64url(JSON.stringify(payload));
  const signature = sign(body, env.SESSION_SECRET);
  return `${body}.${signature}`;
}

/** Validate a session token; returns the payload or null if invalid/expired. */
export function verifySessionToken(
  token: string | undefined,
  now: Date = new Date(),
): SessionPayload | null {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const env = loadEnv();
  const expected = sign(body, env.SESSION_SECRET);
  if (!safeEqual(signature, expected)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as SessionPayload;
    if (typeof payload.exp !== "number") return null;
    if (payload.exp < Math.floor(now.getTime() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Read the current reviewer session from cookies (server-side). */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
} as const;
