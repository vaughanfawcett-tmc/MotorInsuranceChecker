import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyIntakeAuth } from "@/lib/auth";
import { createUploadToken } from "@/lib/upload-link";

export const runtime = "nodejs";

const bodySchema = z.object({
  reference: z.string().min(1),
  driverName: z.string().min(1),
  vehicleRegistration: z.string().min(1),
  vehicleMakeModel: z.string().min(1).nullable().optional(),
  /** Optional override for link lifetime in seconds. */
  ttlSeconds: z.number().int().positive().max(60 * 60 * 24 * 30).optional(),
});

/**
 * Mint a signed driver upload link. The TMC portal calls this (authenticated
 * with the shared secret) when a driver needs to submit a certificate, passing
 * the expected driver name and registration. Returns a public URL the driver
 * can open without logging in; the signed token carries (and protects) the
 * values their certificate is matched against.
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!verifyIntakeAuth(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid body" },
      { status: 400 },
    );
  }

  const token = createUploadToken(parsed.data);
  // Build an absolute URL from the request origin so links work in any env.
  const origin = new URL(request.url).origin;
  const url = `${origin}/u/${token}`;

  return NextResponse.json({ url }, { status: 201 });
}
