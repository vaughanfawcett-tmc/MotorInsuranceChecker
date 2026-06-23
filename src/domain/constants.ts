/**
 * Single source of truth for status values, check names, and rejection reason
 * codes. No magic strings elsewhere in the codebase.
 */

/** Final decision for a submission. */
export const Decision = {
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  MANUAL_REVIEW: "MANUAL_REVIEW",
} as const;
export type Decision = (typeof Decision)[keyof typeof Decision];

/** Outcome of an individual validation check. */
export const CheckStatus = {
  PASS: "PASS",
  FAIL: "FAIL",
  REVIEW: "REVIEW",
} as const;
export type CheckStatus = (typeof CheckStatus)[keyof typeof CheckStatus];

/** The five core checks (plus document classification) from the brief. */
export const CheckName = {
  DOCUMENT_TYPE: "DOCUMENT_TYPE",
  DRIVER_MATCH: "DRIVER_MATCH",
  VEHICLE_MATCH: "VEHICLE_MATCH",
  BUSINESS_USE: "BUSINESS_USE",
  POLICY_VALIDITY: "POLICY_VALIDITY",
} as const;
export type CheckName = (typeof CheckName)[keyof typeof CheckName];

/** Taxonomy categories from "Possible Rejection Reasons" (reviewer grouping). */
export const RejectionCategory = {
  IDENTITY_MISMATCH: "Policyholder / Identity Mismatch",
  VEHICLE_MISMATCH: "Vehicle Mismatch",
  DOCUMENT_TYPE: "Document Type Issues",
  BUSINESS_USE: "Business Use Validation",
  POLICY_VALIDITY: "Policy Validity & Dates",
  AUTHENTICITY: "Document Authenticity / Integrity",
  MANDATORY_FIELDS: "Mandatory Fields Missing",
  COVERAGE_LIMITS: "Coverage Limitations / Exclusions",
  DUPLICATE: "Duplicate / Reused Documents",
  EDGE_CASE: "Edge Cases",
} as const;
export type RejectionCategory =
  (typeof RejectionCategory)[keyof typeof RejectionCategory];

interface RejectionReasonDef {
  readonly category: RejectionCategory;
  /** Reviewer-facing British English label. */
  readonly label: string;
}

/**
 * Rejection reason codes the engine can emit. Codes are stable identifiers;
 * labels are display copy. Extend the exception logic by adding codes here.
 */
export const RejectionReason = {
  DOC_NOT_CERTIFICATE: {
    category: RejectionCategory.DOCUMENT_TYPE,
    label: "Document is not a Certificate of Motor Insurance",
  },
  DOC_ILLEGIBLE: {
    category: RejectionCategory.DOCUMENT_TYPE,
    label: "Document is illegible or too low quality to read",
  },
  DRIVER_MISSING: {
    category: RejectionCategory.MANDATORY_FIELDS,
    label: "No policyholder or driver name present on the document",
  },
  DRIVER_NO_MATCH: {
    category: RejectionCategory.IDENTITY_MISMATCH,
    label: "Driver name does not match the TMC record",
  },
  VEHICLE_REG_MISSING: {
    category: RejectionCategory.MANDATORY_FIELDS,
    label: "Vehicle registration is missing from the document",
  },
  VEHICLE_NO_MATCH: {
    category: RejectionCategory.VEHICLE_MISMATCH,
    label: "Vehicle registration does not match the TMC record",
  },
  USAGE_BUSINESS_NOT_PERMITTED: {
    category: RejectionCategory.BUSINESS_USE,
    label: "Business use is not permitted by the policy",
  },
  USAGE_MISSING: {
    category: RejectionCategory.BUSINESS_USE,
    label: "Permitted usage is not stated on the document",
  },
  POLICY_EXPIRED: {
    category: RejectionCategory.POLICY_VALIDITY,
    label: "Policy has expired",
  },
  POLICY_DATES_MISSING: {
    category: RejectionCategory.MANDATORY_FIELDS,
    label: "Policy start or end date is missing",
  },
} as const;

export type RejectionReasonCode = keyof typeof RejectionReason;

export function rejectionLabel(code: RejectionReasonCode): string {
  return RejectionReason[code].label;
}

/** Document classifications the extractor may assign. */
export const DocumentType = {
  CERTIFICATE_OF_MOTOR_INSURANCE: "CERTIFICATE_OF_MOTOR_INSURANCE",
  POLICY_SCHEDULE: "POLICY_SCHEDULE",
  QUOTE: "QUOTE",
  COVER_LETTER: "COVER_LETTER",
  INVOICE: "INVOICE",
  SCREENSHOT: "SCREENSHOT",
  OTHER: "OTHER",
  UNREADABLE: "UNREADABLE",
} as const;
export type DocumentType = (typeof DocumentType)[keyof typeof DocumentType];
