import { CheckName, CheckStatus } from "../constants";
import type { CertificateExtraction } from "../extraction.schema";
import type { CheckResult } from "../types";

/**
 * Step 5: policy must be currently valid.
 * - missing start/end -> reject (mandatory field)
 * - asOf before start  -> manual review (future-dated, not yet active)
 * - asOf after end      -> reject (expired)
 * - otherwise           -> pass
 *
 * `asOf` is an ISO date (YYYY-MM-DD) so the check is pure and deterministic;
 * the caller injects "today". End date is treated as inclusive.
 */
export function checkValidity(
  extraction: CertificateExtraction,
  asOf: string,
): CheckResult {
  const { policyStartDate: start, policyEndDate: end } = extraction;

  if (!start || !end) {
    return {
      name: CheckName.POLICY_VALIDITY,
      status: CheckStatus.FAIL,
      reasonCode: "POLICY_DATES_MISSING",
      detail: `Policy dates incomplete (start: ${start ?? "missing"}, end: ${end ?? "missing"}).`,
    };
  }

  // ISO date strings compare lexicographically in chronological order.
  if (asOf < start) {
    return {
      name: CheckName.POLICY_VALIDITY,
      status: CheckStatus.REVIEW,
      detail: `Policy is future-dated; cover starts ${start} (today is ${asOf}).`,
    };
  }
  if (asOf > end) {
    return {
      name: CheckName.POLICY_VALIDITY,
      status: CheckStatus.FAIL,
      reasonCode: "POLICY_EXPIRED",
      detail: `Policy expired on ${end} (today is ${asOf}).`,
    };
  }

  return {
    name: CheckName.POLICY_VALIDITY,
    status: CheckStatus.PASS,
    detail: `Policy valid ${start} to ${end} (inclusive).`,
  };
}
