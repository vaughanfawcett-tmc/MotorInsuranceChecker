import { CheckStatus, Decision } from "./constants";
import type { RejectionReasonCode } from "./constants";
import type { CheckResult, ValidationResult } from "./types";

export interface DecisionInputs {
  readonly checks: readonly CheckResult[];
  /** Overall extraction confidence (0..1). */
  readonly overallConfidence: number;
  /** Below this, route to manual review even if checks pass. */
  readonly confidenceThreshold: number;
  /** Force manual review (e.g. suspected tampering) regardless of checks. */
  readonly forceReview?: boolean;
}

/**
 * Step 6: combine check outcomes into a final decision.
 * - any FAIL  -> REJECTED (with all distinct reasons)
 * - any REVIEW, low confidence, or forced -> MANUAL_REVIEW
 * - otherwise -> APPROVED
 *
 * A reject takes precedence over review: a document that fails a hard rule is
 * rejected, not sent to review, so reviewers only see genuinely ambiguous cases.
 */
export function decide(inputs: DecisionInputs): ValidationResult {
  const { checks, overallConfidence, confidenceThreshold, forceReview } = inputs;

  const failed = checks.filter((c) => c.status === CheckStatus.FAIL);
  if (failed.length > 0) {
    const reasons: RejectionReasonCode[] = [];
    for (const check of failed) {
      if (check.reasonCode && !reasons.includes(check.reasonCode)) {
        reasons.push(check.reasonCode);
      }
    }
    return { decision: Decision.REJECTED, checks, rejectionReasons: reasons };
  }

  const hasReview = checks.some((c) => c.status === CheckStatus.REVIEW);
  const lowConfidence = overallConfidence < confidenceThreshold;
  if (hasReview || lowConfidence || forceReview) {
    return { decision: Decision.MANUAL_REVIEW, checks, rejectionReasons: [] };
  }

  return { decision: Decision.APPROVED, checks, rejectionReasons: [] };
}
