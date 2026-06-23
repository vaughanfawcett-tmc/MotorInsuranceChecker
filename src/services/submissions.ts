import { z } from "zod";
import { prisma } from "@/lib/db";
import { CheckStatus, Decision } from "@/domain/constants";
import type { CheckName, RejectionReasonCode } from "@/domain/constants";
import { certificateExtractionSchema } from "@/domain/extraction.schema";
import type { CertificateExtraction } from "@/domain/extraction.schema";
import { appendAudit, AuditAction } from "./audit";

/** Reviewer-facing view of a submission with JSON columns parsed. */
export interface SubmissionView {
  id: string;
  createdAt: Date;
  tmcReference: string;
  originalFilename: string;
  mediaType: string;
  extractionMode: string;
  status: Decision;
  extraction: CertificateExtraction | null;
  checks: ParsedCheck[];
  rejectionReasons: RejectionReasonCode[];
  reviewedBy: string | null;
  reviewedAt: Date | null;
  reviewNote: string | null;
}

export interface ParsedCheck {
  name: CheckName;
  status: CheckStatus;
  reasonCode?: RejectionReasonCode;
  detail: string;
}

const checksSchema = z.array(
  z.object({
    name: z.string(),
    status: z.string(),
    reasonCode: z.string().optional(),
    detail: z.string(),
  }),
);

function parseChecks(json: string | null): ParsedCheck[] {
  if (!json) return [];
  const parsed = checksSchema.safeParse(JSON.parse(json));
  if (!parsed.success) return [];
  return parsed.data as ParsedCheck[];
}

function parseExtraction(json: string | null): CertificateExtraction | null {
  if (!json) return null;
  const parsed = certificateExtractionSchema.safeParse(JSON.parse(json));
  return parsed.success ? parsed.data : null;
}

function parseReasons(json: string | null): RejectionReasonCode[] {
  if (!json) return [];
  const parsed = z.array(z.string()).safeParse(JSON.parse(json));
  return parsed.success ? (parsed.data as RejectionReasonCode[]) : [];
}

type SubmissionRow = {
  id: string;
  createdAt: Date;
  tmcReference: string;
  originalFilename: string;
  mediaType: string;
  extractionMode: string;
  status: string;
  extractionJson: string | null;
  checksJson: string | null;
  rejectionReasonsJson: string | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  reviewNote: string | null;
};

function toView(row: SubmissionRow): SubmissionView {
  return {
    id: row.id,
    createdAt: row.createdAt,
    tmcReference: row.tmcReference,
    originalFilename: row.originalFilename,
    mediaType: row.mediaType,
    extractionMode: row.extractionMode,
    status: row.status as Decision,
    extraction: parseExtraction(row.extractionJson),
    checks: parseChecks(row.checksJson),
    rejectionReasons: parseReasons(row.rejectionReasonsJson),
    reviewedBy: row.reviewedBy,
    reviewedAt: row.reviewedAt,
    reviewNote: row.reviewNote,
  };
}

export async function listSubmissions(
  status?: Decision,
): Promise<SubmissionView[]> {
  const rows = await prisma.submission.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toView);
}

export async function countByStatus(): Promise<Record<string, number>> {
  const grouped = await prisma.submission.groupBy({
    by: ["status"],
    _count: true,
  });
  const counts: Record<string, number> = {};
  for (const g of grouped) counts[g.status] = g._count;
  return counts;
}

export async function getSubmission(id: string): Promise<SubmissionView | null> {
  const row = await prisma.submission.findUnique({ where: { id } });
  return row ? toView(row) : null;
}

export async function getAuditTrail(submissionId: string) {
  return prisma.auditLog.findMany({
    where: { submissionId },
    orderBy: { createdAt: "asc" },
  });
}

/** A reviewer's manual decision on a submission awaiting review. */
export async function recordReview(params: {
  submissionId: string;
  decision: typeof Decision.APPROVED | typeof Decision.REJECTED;
  note: string;
  actor: string;
}): Promise<{ ok: boolean; error?: string }> {
  const submission = await prisma.submission.findUnique({
    where: { id: params.submissionId },
  });
  if (!submission) return { ok: false, error: "Submission not found" };
  if (submission.status !== Decision.MANUAL_REVIEW) {
    return { ok: false, error: "Submission is not awaiting review" };
  }

  await prisma.submission.update({
    where: { id: params.submissionId },
    data: {
      status: params.decision,
      reviewedBy: params.actor,
      reviewedAt: new Date(),
      reviewNote: params.note || null,
    },
  });

  await appendAudit(prisma, {
    submissionId: params.submissionId,
    actor: params.actor,
    action:
      params.decision === Decision.APPROVED
        ? AuditAction.REVIEW_APPROVED
        : AuditAction.REVIEW_REJECTED,
    detail: params.note
      ? `Manual ${params.decision.toLowerCase()}: ${params.note}`
      : `Manual ${params.decision.toLowerCase()}.`,
  });

  return { ok: true };
}
