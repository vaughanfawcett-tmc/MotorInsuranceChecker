import { describe, expect, it } from "vitest";
import { certificateExtractionSchema } from "@/domain/extraction.schema";
import { SeedTmcClient } from "@/services/tmc/seed-tmc-client";
import { MockExtractor } from "@/services/extraction/mock-extractor";
import { tmcRecord } from "./helpers";

describe("SeedTmcClient", () => {
  it("resolves a known reference and returns null for unknown", async () => {
    const client = SeedTmcClient.fromRecords([tmcRecord({ reference: "EMP-001" })]);
    expect(await client.getRecord("EMP-001")).toMatchObject({ reference: "EMP-001" });
    expect(await client.getRecord("NOPE")).toBeNull();
  });
});

describe("MockExtractor", () => {
  it("returns a schema-valid extraction", async () => {
    const out = await new MockExtractor().extract({
      bytes: Buffer.from("x"),
      mediaType: "application/pdf",
    });
    expect(() => certificateExtractionSchema.parse(out)).not.toThrow();
  });

  it("applies overrides for failure-path testing", async () => {
    const out = await new MockExtractor({ vehicleRegistration: null }).extract({
      bytes: Buffer.from("x"),
      mediaType: "application/pdf",
    });
    expect(out.vehicleRegistration).toBeNull();
  });
});
