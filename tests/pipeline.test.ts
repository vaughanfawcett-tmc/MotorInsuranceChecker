import { describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { Decision } from "@/domain/constants";
import { processSubmission, type PipelineDeps } from "@/services/pipeline";
import { SeedTmcClient } from "@/services/tmc/seed-tmc-client";
import { MockExtractor } from "@/services/extraction/mock-extractor";
import type { Extractor } from "@/services/extraction/extractor";
import { tmcRecord } from "./helpers";

/** Minimal in-memory stand-in for the Prisma client used by the pipeline. */
function fakeDb(prior: { id: string } | null = null) {
  const submissions: Array<Record<string, unknown> & { id: string }> = [];
  const audits: Array<{ action: string; detail: string }> = [];
  const db = {
    submission: {
      findFirst: async () => prior,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: `sub_${submissions.length + 1}`, ...data };
        submissions.push(row);
        return row;
      },
    },
    auditLog: {
      create: async ({ data }: { data: { action: string; detail: string } }) => {
        audits.push(data);
        return data;
      },
    },
    // Cast: this fake implements only the surface the pipeline touches.
  } as unknown as PrismaClient;
  return { db, submissions, audits };
}

function deps(overrides: Partial<PipelineDeps> = {}): PipelineDeps {
  return {
    db: fakeDb().db,
    tmc: SeedTmcClient.fromRecords([tmcRecord({ reference: "EMP-001" })]),
    extractor: new MockExtractor(),
    extractionMode: "mock",
    confidenceThreshold: 0.7,
    now: () => new Date("2026-06-22T09:00:00Z"),
    ...overrides,
  };
}

const input = {
  tmcReference: "EMP-001",
  filename: "cert.pdf",
  mediaType: "application/pdf" as const,
  bytes: Buffer.from("%PDF-1.4 fake"),
};

describe("processSubmission", () => {
  it("approves a matching, valid document and writes an audit trail", async () => {
    const store = fakeDb();
    const result = await processSubmission(deps({ db: store.db }), input);
    expect(result.decision).toBe(Decision.APPROVED);
    const actions = store.audits.map((a) => a.action);
    expect(actions).toContain("SUBMISSION_RECEIVED");
    expect(actions).toContain("DECISION_RECORDED");
  });

  it("routes an unknown TMC reference to manual review", async () => {
    const store = fakeDb();
    const result = await processSubmission(
      deps({
        db: store.db,
        tmc: SeedTmcClient.fromRecords([]),
      }),
      input,
    );
    expect(result.decision).toBe(Decision.MANUAL_REVIEW);
    expect(store.audits.map((a) => a.action)).toContain("TMC_REFERENCE_UNKNOWN");
  });

  it("routes an extraction failure to manual review", async () => {
    const store = fakeDb();
    const throwing: Extractor = {
      extract: () => Promise.reject(new Error("model unavailable")),
    };
    const result = await processSubmission(
      deps({ db: store.db, extractor: throwing }),
      input,
    );
    expect(result.decision).toBe(Decision.MANUAL_REVIEW);
    expect(store.audits.map((a) => a.action)).toContain("EXTRACTION_FAILED");
  });

  it("withholds auto-approval for a duplicate file", async () => {
    const store = fakeDb({ id: "sub_prior" });
    const result = await processSubmission(deps({ db: store.db }), input);
    expect(result.decision).toBe(Decision.MANUAL_REVIEW);
    expect(store.audits.map((a) => a.action)).toContain("DUPLICATE_DETECTED");
  });
});
