import { DocumentType } from "@/domain/constants";
import {
  BusinessUseStatement,
  type CertificateExtraction,
} from "@/domain/extraction.schema";
import type { DocumentInput, Extractor } from "./extractor";

/**
 * Deterministic extractor for local dev (no API key) and tests. It does NOT
 * read the document; it returns a fixed, valid extraction so the rest of the
 * pipeline and dashboard can be exercised end to end. Never use in production.
 */
export class MockExtractor implements Extractor {
  constructor(private readonly fixed: Partial<CertificateExtraction> = {}) {}

  extract(_input: DocumentInput): Promise<CertificateExtraction> {
    const base: CertificateExtraction = {
      documentType: DocumentType.CERTIFICATE_OF_MOTOR_INSURANCE,
      documentTypeConfidence: 0.97,
      legible: true,
      signsOfTampering: false,
      policyholderName: "John Smith",
      driverNames: ["John Smith"],
      vehicleRegistration: "AB12 CDE",
      vehicleMakeModel: "Ford Transit",
      permittedUsageText: "Social, Domestic & Pleasure and Business Use",
      businessUseStated: BusinessUseStatement.YES,
      policyNumber: "POL-123456",
      insurerName: "Aviva",
      policyStartDate: "2026-01-01",
      policyEndDate: "2026-12-31",
      overallConfidence: 0.94,
      notes: "Mock extraction (no document was read).",
    };
    return Promise.resolve({ ...base, ...this.fixed });
  }
}
