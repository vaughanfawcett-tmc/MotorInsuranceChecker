import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetEnvForTests } from "@/lib/env";
import {
  createUploadToken,
  verifyUploadToken,
} from "@/lib/upload-link";

// loadEnv() validates the whole environment, so provide a complete valid set.
const REQUIRED_ENV: Record<string, string> = {
  DATABASE_URL: "postgresql://u:p@localhost:5432/test",
  INTAKE_SHARED_SECRET: "test-intake-secret-0123456789",
  DASHBOARD_PASSWORD: "test-password",
  SESSION_SECRET: "test-session-secret-0123456789",
  UPLOAD_LINK_SECRET: "test-upload-link-secret-0123456789",
};
const ORIGINAL = { ...process.env };

beforeEach(() => {
  Object.assign(process.env, REQUIRED_ENV);
  resetEnvForTests();
});

afterEach(() => {
  process.env = { ...ORIGINAL };
  resetEnvForTests();
});

const input = {
  reference: "EMP-001",
  driverName: "John Smith",
  vehicleRegistration: "AB12 CDE",
  vehicleMakeModel: "Ford Transit",
};

describe("upload link tokens", () => {
  it("round-trips a valid token", () => {
    const token = createUploadToken(input);
    const payload = verifyUploadToken(token);
    expect(payload).toMatchObject({
      reference: "EMP-001",
      driverName: "John Smith",
      vehicleRegistration: "AB12 CDE",
      vehicleMakeModel: "Ford Transit",
    });
  });

  it("rejects a tampered payload (changed registration)", () => {
    const token = createUploadToken(input);
    const [body, sig] = token.split(".");
    const forged = JSON.parse(Buffer.from(body!, "base64url").toString("utf8"));
    forged.vehicleRegistration = "ZZ99 ZZZ";
    const forgedBody = Buffer.from(JSON.stringify(forged)).toString("base64url");
    // Reuse the original signature with the altered body.
    expect(verifyUploadToken(`${forgedBody}.${sig}`)).toBeNull();
  });

  it("rejects a token signed with a different secret", () => {
    const token = createUploadToken(input);
    process.env.UPLOAD_LINK_SECRET = "a-completely-different-secret-9999";
    resetEnvForTests();
    expect(verifyUploadToken(token)).toBeNull();
  });

  it("rejects an expired token", () => {
    const past = new Date("2026-01-01T00:00:00Z");
    const token = createUploadToken({ ...input, ttlSeconds: 60 }, past);
    const later = new Date("2026-01-01T00:02:00Z");
    expect(verifyUploadToken(token, later)).toBeNull();
  });

  it("accepts a token still within its window", () => {
    const start = new Date("2026-01-01T00:00:00Z");
    const token = createUploadToken({ ...input, ttlSeconds: 3600 }, start);
    const soon = new Date("2026-01-01T00:30:00Z");
    expect(verifyUploadToken(token, soon)).not.toBeNull();
  });

  it("returns null for malformed input", () => {
    expect(verifyUploadToken(undefined)).toBeNull();
    expect(verifyUploadToken("")).toBeNull();
    expect(verifyUploadToken("garbage")).toBeNull();
    expect(verifyUploadToken("only.")).toBeNull();
  });
});
