import { decide } from "./decision";
import { classifyDocument } from "./matching/classify-check";
import { matchDriver } from "./matching/driver-match";
import { matchVehicle } from "./matching/vehicle-match";
import { checkBusinessUse } from "./matching/usage-check";
import { checkValidity } from "./matching/validity-check";
import type { CertificateExtraction } from "./extraction.schema";
import type { CheckResult, TmcRecord, ValidationResult } from "./types";

export interface ValidateParams {
  readonly extraction: CertificateExtraction;
  readonly tmc: TmcRecord;
  /** ISO date (YYYY-MM-DD) treated as "today". */
  readonly asOf: string;
  readonly confidenceThreshold: number;
}

/**
 * Pure end-to-end validation: run the five checks plus classification, then
 * combine into a decision. No I/O. The caller supplies the extraction, the
 * authoritative TMC record, the current date, and the confidence threshold.
 */
export function validateCertificate(params: ValidateParams): ValidationResult {
  const { extraction, tmc, asOf, confidenceThreshold } = params;

  const checks: CheckResult[] = [
    classifyDocument(extraction),
    matchDriver(extraction, tmc),
    matchVehicle(extraction, tmc),
    checkBusinessUse(extraction),
    checkValidity(extraction, asOf),
  ];

  return decide({
    checks,
    overallConfidence: extraction.overallConfidence,
    confidenceThreshold,
    forceReview: extraction.signsOfTampering,
  });
}
