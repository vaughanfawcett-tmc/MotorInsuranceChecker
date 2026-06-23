import { DocumentType } from "@/domain/constants";
import { BusinessUseStatement } from "@/domain/extraction.schema";
import type { CertificateExtraction } from "@/domain/extraction.schema";
import type { TmcRecord } from "@/domain/types";

/** A fully valid extraction that should auto-approve against `tmcRecord()`. */
export function validExtraction(
  overrides: Partial<CertificateExtraction> = {},
): CertificateExtraction {
  return {
    documentType: DocumentType.CERTIFICATE_OF_MOTOR_INSURANCE,
    documentTypeConfidence: 0.98,
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
    overallConfidence: 0.95,
    notes: null,
    ...overrides,
  };
}

export function tmcRecord(overrides: Partial<TmcRecord> = {}): TmcRecord {
  return {
    reference: "EMP-001",
    driverName: "John Smith",
    vehicleRegistration: "AB12 CDE",
    vehicleMakeModel: "Ford Transit",
    ...overrides,
  };
}

export const TODAY = "2026-06-22";
