import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { loadEnv } from "./env";

/**
 * Signed driver upload links. The TMC portal mints a link carrying the expected
 * driver name and vehicle registration for one driver, signed with a shared
 * secret. The app verifies the signature before trusting those values, so a
 * driver cannot alter what their certificate is matched against. The token is
 * the authorisation for the public upload page; no login is involved.
 */

const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export const uploadLinkPayloadSchema = z.object({
  /** Opaque reference for the driver/submission (e.g. employee id). */
  reference: z.string().min(1),
  /** Expected policyholder/driver name to match the certificate against. */
  driverName: z.string().min(1),
  /** Expected vehicle registration. */
  vehicleRegistration: z.string().min(1),
  /** Optional expected make/model for a secondary cross-check. */
  vehicleMakeModel: z.string().min(1).nullable().optional(),
  /** Expiry, unix seconds. */
  exp: z.number().int().positive(),
});

export type UploadLinkPayload = z.infer<typeof uploadLinkPayloadSchema>;

export interface MintUploadTokenInput {
  reference: string;
  driverName: string;
  vehicleRegistration: string;
  vehicleMakeModel?: string | null;
  ttlSeconds?: number;
}

function base64url(input: string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

/** Constant-time comparison that tolerates differing lengths. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** Create a signed `<body>.<signature>` token for a driver upload link. */
export function createUploadToken(
  input: MintUploadTokenInput,
  now: Date = new Date(),
): string {
  const env = loadEnv();
  const exp =
    Math.floor(now.getTime() / 1000) +
    (input.ttlSeconds ?? DEFAULT_TTL_SECONDS);

  const payload: UploadLinkPayload = {
    reference: input.reference,
    driverName: input.driverName,
    vehicleRegistration: input.vehicleRegistration,
    vehicleMakeModel: input.vehicleMakeModel ?? null,
    exp,
  };

  const body = base64url(JSON.stringify(payload));
  const signature = sign(body, env.UPLOAD_LINK_SECRET);
  return `${body}.${signature}`;
}

/**
 * Verify a token and return its payload, or null if the signature is invalid,
 * the body is malformed, or it has expired. Never throws on bad input.
 */
export function verifyUploadToken(
  token: string | undefined,
  now: Date = new Date(),
): UploadLinkPayload | null {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  if (!body || !signature) return null;

  const env = loadEnv();
  const expected = sign(body, env.UPLOAD_LINK_SECRET);
  if (!safeEqual(signature, expected)) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  const result = uploadLinkPayloadSchema.safeParse(parsed);
  if (!result.success) return null;
  if (result.data.exp < Math.floor(now.getTime() / 1000)) return null;
  return result.data;
}
