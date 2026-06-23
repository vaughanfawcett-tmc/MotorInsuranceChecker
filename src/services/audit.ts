import type { PrismaClient } from "@prisma/client";

/** Audit actions. Append-only: entries are created, never updated or deleted. */
export const AuditAction = {
  SUBMISSION_RECEIVED: "SUBMISSION_RECEIVED",
  DECISION_RECORDED: "DECISION_RECORDED",
  EXTRACTION_FAILED: "EXTRACTION_FAILED",
  DUPLICATE_DETECTED: "DUPLICATE_DETECTED",
  TMC_REFERENCE_UNKNOWN: "TMC_REFERENCE_UNKNOWN",
  REVIEW_APPROVED: "REVIEW_APPROVED",
  REVIEW_REJECTED: "REVIEW_REJECTED",
} as const;
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

/** Reserved actor for automated pipeline entries. */
export const SYSTEM_ACTOR = "system";

export interface AuditEntry {
  readonly submissionId: string;
  readonly actor: string;
  readonly action: AuditAction;
  readonly detail: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Append one row to the audit log. The only write path for AuditLog in the
 * codebase; there is intentionally no update or delete.
 */
export async function appendAudit(
  db: PrismaClient,
  entry: AuditEntry,
): Promise<void> {
  await db.auditLog.create({
    data: {
      submissionId: entry.submissionId,
      actor: entry.actor,
      action: entry.action,
      detail: entry.detail,
      metadataJson: entry.metadata ? JSON.stringify(entry.metadata) : null,
    },
  });
}
