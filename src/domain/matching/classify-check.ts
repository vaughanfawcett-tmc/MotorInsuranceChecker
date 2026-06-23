import { CheckName, CheckStatus, DocumentType } from "../constants";
import type { CertificateExtraction } from "../extraction.schema";
import type { CheckResult } from "../types";

/** At/above this confidence, a non-certificate classification is a hard reject. */
const CLASSIFY_CONFIDENT = 0.6;

/**
 * Step 1: document must be a Certificate of Motor Insurance.
 * - illegible/unreadable -> reject
 * - confidently not a certificate -> reject
 * - probably not a certificate (low confidence) -> manual review
 * - certificate -> pass
 */
export function classifyDocument(extraction: CertificateExtraction): CheckResult {
  if (!extraction.legible || extraction.documentType === DocumentType.UNREADABLE) {
    return {
      name: CheckName.DOCUMENT_TYPE,
      status: CheckStatus.FAIL,
      reasonCode: "DOC_ILLEGIBLE",
      detail: "Document is illegible or too low quality to read reliably.",
    };
  }

  if (extraction.documentType === DocumentType.CERTIFICATE_OF_MOTOR_INSURANCE) {
    return {
      name: CheckName.DOCUMENT_TYPE,
      status: CheckStatus.PASS,
      detail: "Document is a Certificate of Motor Insurance.",
    };
  }

  if (extraction.documentTypeConfidence >= CLASSIFY_CONFIDENT) {
    return {
      name: CheckName.DOCUMENT_TYPE,
      status: CheckStatus.FAIL,
      reasonCode: "DOC_NOT_CERTIFICATE",
      detail: `Document classified as ${extraction.documentType}, not a Certificate of Motor Insurance.`,
    };
  }

  return {
    name: CheckName.DOCUMENT_TYPE,
    status: CheckStatus.REVIEW,
    detail: `Uncertain document type (${extraction.documentType}, confidence ${extraction.documentTypeConfidence.toFixed(2)}); needs human confirmation.`,
  };
}
