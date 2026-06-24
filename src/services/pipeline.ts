import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { Decision } from "@/domain/constants";
import { validateCertificate } from "@/domain/validate";
import type { ValidationResult } from "@/domain/types";
import { appendAudit, AuditAction, SYSTEM_ACTOR } from "./audit";
import type {
  ExtractionMode,
  Extractor,
  SupportedMediaType,
} from "./extraction/extractor";
import type { FileStore } from "./storage/file-store";
import type { TmcClient } from "./tmc/tmc-client";

export interface SubmissionInput {
  readonly tmcReference: string;
  readonly filename: string;
  readonly mediaType: SupportedMediaType;
  readonly bytes: Buffer;
}

export interface PipelineDeps {
  readonly db: PrismaClient;
  readonly tmc: TmcClient;
  readonly extractor: Extractor;
  readonly extractionMode: ExtractionMode;
  readonly fileStore: FileStore;
  readonly confidenceThreshold: number;
  /** Injected clock keeps the pipeline testable and deterministic. */
  readonly now: () => Date;
}

export interface PipelineResult {
  readonly submissionId: string;
  readonly decision: Decision;
}

/**
 * End-to-end intake pipeline (I/O edge): persist the file, extract, look up the
 * TMC record, validate, and record the decision with a full audit trail.
 * Expected failures (unknown reference, extraction error) route to manual
 * review and are logged; nothing is swallowed silently.
 */
export async function processSubmission(
  deps: PipelineDeps,
  input: SubmissionInput,
): Promise<PipelineResult> {
  const { db } = deps;
  const sha256 = createHash("sha256").update(input.bytes).digest("hex");

  // Persist the original file (named by content hash so identical files dedupe).
  const stored = await deps.fileStore.put({
    key: sha256,
    bytes: input.bytes,
    mediaType: input.mediaType,
  });
  const storedPath = stored.location;

  const priorDuplicate = await db.submission.findFirst({
    where: { fileSha256: sha256 },
    orderBy: { createdAt: "asc" },
  });

  // Run extraction; an extraction failure is an expected operational outcome.
  let extraction: Awaited<ReturnType<Extractor["extract"]>> | null = null;
  let extractionError: string | null = null;
  try {
    extraction = await deps.extractor.extract({
      bytes: input.bytes,
      mediaType: input.mediaType,
    });
  } catch (error) {
    extractionError = error instanceof Error ? error.message : "Unknown error";
  }

  const record = await deps.tmc.getRecord(input.tmcReference);
  const asOf = deps.now().toISOString().slice(0, 10);

  // Decide status and validation outcome from what we have.
  let status: Decision;
  let validation: ValidationResult | null = null;
  let reviewNote: string | null = null;

  if (!extraction) {
    status = Decision.MANUAL_REVIEW;
    reviewNote = `Extraction failed: ${extractionError}`;
  } else if (!record) {
    status = Decision.MANUAL_REVIEW;
    reviewNote = `Unknown TMC reference "${input.tmcReference}"; cannot match automatically.`;
  } else {
    validation = validateCertificate({
      extraction,
      tmc: record,
      asOf,
      confidenceThreshold: deps.confidenceThreshold,
    });
    status = validation.decision;
    // A duplicate of a previously seen document must not auto-approve.
    if (priorDuplicate && status === Decision.APPROVED) {
      status = Decision.MANUAL_REVIEW;
      reviewNote = "Auto-approval withheld: duplicate of an earlier submission.";
    }
  }

  const submission = await db.submission.create({
    data: {
      tmcReference: input.tmcReference,
      originalFilename: input.filename,
      mediaType: input.mediaType,
      fileSize: input.bytes.length,
      fileSha256: sha256,
      storedPath,
      extractionMode: deps.extractionMode,
      status,
      extractionJson: extraction ? JSON.stringify(extraction) : null,
      checksJson: validation ? JSON.stringify(validation.checks) : null,
      rejectionReasonsJson: validation
        ? JSON.stringify(validation.rejectionReasons)
        : null,
      reviewNote,
    },
  });

  // Audit trail (append-only).
  await appendAudit(db, {
    submissionId: submission.id,
    actor: SYSTEM_ACTOR,
    action: AuditAction.SUBMISSION_RECEIVED,
    detail: `Received ${input.filename} (${input.mediaType}) for ${input.tmcReference}.`,
    metadata: { sha256, extractionMode: deps.extractionMode },
  });

  if (extractionError) {
    await appendAudit(db, {
      submissionId: submission.id,
      actor: SYSTEM_ACTOR,
      action: AuditAction.EXTRACTION_FAILED,
      detail: extractionError,
    });
  }
  if (!record) {
    await appendAudit(db, {
      submissionId: submission.id,
      actor: SYSTEM_ACTOR,
      action: AuditAction.TMC_REFERENCE_UNKNOWN,
      detail: `No TMC record for "${input.tmcReference}".`,
    });
  }
  if (priorDuplicate) {
    await appendAudit(db, {
      submissionId: submission.id,
      actor: SYSTEM_ACTOR,
      action: AuditAction.DUPLICATE_DETECTED,
      detail: `Same file previously submitted (submission ${priorDuplicate.id}).`,
      metadata: { priorSubmissionId: priorDuplicate.id },
    });
  }
  await appendAudit(db, {
    submissionId: submission.id,
    actor: SYSTEM_ACTOR,
    action: AuditAction.DECISION_RECORDED,
    detail: `Automated decision: ${status}.`,
    metadata: validation
      ? { rejectionReasons: validation.rejectionReasons }
      : undefined,
  });

  return { submissionId: submission.id, decision: status };
}
