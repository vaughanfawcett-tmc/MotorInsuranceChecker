import { CheckName, CheckStatus } from "../constants";
import { BusinessUseStatement } from "../extraction.schema";
import type { CertificateExtraction } from "../extraction.schema";
import type { CheckResult } from "../types";

/**
 * CRITICAL RULE (Step 4): business use must be explicitly permitted.
 * - explicitly present -> pass
 * - unclear/ambiguous   -> manual review
 * - stated and excludes business -> reject (not permitted)
 * - usage not stated at all      -> reject (missing)
 */
export function checkBusinessUse(extraction: CertificateExtraction): CheckResult {
  switch (extraction.businessUseStated) {
    case BusinessUseStatement.YES:
      return {
        name: CheckName.BUSINESS_USE,
        status: CheckStatus.PASS,
        detail: extraction.permittedUsageText
          ? `Business use permitted: "${extraction.permittedUsageText}".`
          : "Business use permitted.",
      };
    case BusinessUseStatement.UNCLEAR:
      return {
        name: CheckName.BUSINESS_USE,
        status: CheckStatus.REVIEW,
        detail: extraction.permittedUsageText
          ? `Usage wording is ambiguous: "${extraction.permittedUsageText}".`
          : "Usage wording is ambiguous.",
      };
    case BusinessUseStatement.NO:
    default:
      if (!extraction.permittedUsageText) {
        return {
          name: CheckName.BUSINESS_USE,
          status: CheckStatus.FAIL,
          reasonCode: "USAGE_MISSING",
          detail: "Permitted usage is not stated on the document.",
        };
      }
      return {
        name: CheckName.BUSINESS_USE,
        status: CheckStatus.FAIL,
        reasonCode: "USAGE_BUSINESS_NOT_PERMITTED",
        detail: `Business use not permitted: "${extraction.permittedUsageText}".`,
      };
  }
}
