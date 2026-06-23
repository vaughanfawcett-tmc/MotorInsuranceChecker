import { describe, expect, it } from "vitest";
import {
  CheckName,
  CheckStatus,
  Decision,
  DocumentType,
} from "@/domain/constants";
import { BusinessUseStatement } from "@/domain/extraction.schema";
import { validateCertificate } from "@/domain/validate";
import { classifyDocument } from "@/domain/matching/classify-check";
import { matchDriver, scoreNameMatch } from "@/domain/matching/driver-match";
import { matchVehicle } from "@/domain/matching/vehicle-match";
import { checkBusinessUse } from "@/domain/matching/usage-check";
import { checkValidity } from "@/domain/matching/validity-check";
import { TODAY, tmcRecord, validExtraction } from "./helpers";

const THRESHOLD = 0.7;

function check(name: CheckName, status: CheckStatus, reasonCode?: string) {
  return { name, status, ...(reasonCode ? { reasonCode } : {}) };
}

describe("validateCertificate (end to end, pure)", () => {
  it("approves a fully valid certificate", () => {
    const result = validateCertificate({
      extraction: validExtraction(),
      tmc: tmcRecord(),
      asOf: TODAY,
      confidenceThreshold: THRESHOLD,
    });
    expect(result.decision).toBe(Decision.APPROVED);
    expect(result.rejectionReasons).toEqual([]);
  });

  it("routes low overall confidence to manual review", () => {
    const result = validateCertificate({
      extraction: validExtraction({ overallConfidence: 0.4 }),
      tmc: tmcRecord(),
      asOf: TODAY,
      confidenceThreshold: THRESHOLD,
    });
    expect(result.decision).toBe(Decision.MANUAL_REVIEW);
  });

  it("forces manual review when tampering is suspected", () => {
    const result = validateCertificate({
      extraction: validExtraction({ signsOfTampering: true }),
      tmc: tmcRecord(),
      asOf: TODAY,
      confidenceThreshold: THRESHOLD,
    });
    expect(result.decision).toBe(Decision.MANUAL_REVIEW);
  });

  it("rejects and reports every failing reason at once", () => {
    const result = validateCertificate({
      extraction: validExtraction({
        vehicleRegistration: "ZZ99 ZZZ",
        businessUseStated: BusinessUseStatement.NO,
        permittedUsageText: "Social, Domestic & Pleasure only",
      }),
      tmc: tmcRecord(),
      asOf: TODAY,
      confidenceThreshold: THRESHOLD,
    });
    expect(result.decision).toBe(Decision.REJECTED);
    expect(result.rejectionReasons).toContain("VEHICLE_NO_MATCH");
    expect(result.rejectionReasons).toContain("USAGE_BUSINESS_NOT_PERMITTED");
  });

  it("reject takes precedence over a review on another check", () => {
    const result = validateCertificate({
      // ambiguous usage (review) + expired policy (fail) -> overall reject
      extraction: validExtraction({
        businessUseStated: BusinessUseStatement.UNCLEAR,
        policyEndDate: "2026-01-01",
      }),
      tmc: tmcRecord(),
      asOf: TODAY,
      confidenceThreshold: THRESHOLD,
    });
    expect(result.decision).toBe(Decision.REJECTED);
    expect(result.rejectionReasons).toContain("POLICY_EXPIRED");
  });
});

describe("classifyDocument", () => {
  it("passes a certificate", () => {
    expect(classifyDocument(validExtraction()).status).toBe(CheckStatus.PASS);
  });
  it("rejects an illegible scan", () => {
    const r = classifyDocument(validExtraction({ legible: false }));
    expect(r).toMatchObject(check(CheckName.DOCUMENT_TYPE, CheckStatus.FAIL, "DOC_ILLEGIBLE"));
  });
  it("rejects a confident non-certificate", () => {
    const r = classifyDocument(
      validExtraction({ documentType: DocumentType.QUOTE, documentTypeConfidence: 0.9 }),
    );
    expect(r).toMatchObject(check(CheckName.DOCUMENT_TYPE, CheckStatus.FAIL, "DOC_NOT_CERTIFICATE"));
  });
  it("reviews an uncertain classification", () => {
    const r = classifyDocument(
      validExtraction({ documentType: DocumentType.OTHER, documentTypeConfidence: 0.3 }),
    );
    expect(r.status).toBe(CheckStatus.REVIEW);
  });
});

describe("matchDriver", () => {
  it("passes an exact match ignoring title and case", () => {
    const r = matchDriver(validExtraction({ policyholderName: "MR JOHN SMITH", driverNames: [] }), tmcRecord());
    expect(r.status).toBe(CheckStatus.PASS);
  });
  it("reviews a partial match (initial vs full name)", () => {
    const r = matchDriver(
      validExtraction({ policyholderName: "J Smith", driverNames: [] }),
      tmcRecord({ driverName: "John Smith" }),
    );
    expect(r.status).toBe(CheckStatus.REVIEW);
  });
  it("finds the employee among multiple drivers", () => {
    const r = matchDriver(
      validExtraction({ policyholderName: "Jane Doe", driverNames: ["Jane Doe", "John Smith"] }),
      tmcRecord({ driverName: "John Smith" }),
    );
    expect(r.status).toBe(CheckStatus.PASS);
  });
  it("rejects when no name is present", () => {
    const r = matchDriver(validExtraction({ policyholderName: null, driverNames: [] }), tmcRecord());
    expect(r).toMatchObject(check(CheckName.DRIVER_MATCH, CheckStatus.FAIL, "DRIVER_MISSING"));
  });
  it("rejects a clear mismatch", () => {
    const r = matchDriver(
      validExtraction({ policyholderName: "Alan Turing", driverNames: [] }),
      tmcRecord({ driverName: "John Smith" }),
    );
    expect(r).toMatchObject(check(CheckName.DRIVER_MATCH, CheckStatus.FAIL, "DRIVER_NO_MATCH"));
  });
});

describe("scoreNameMatch", () => {
  it("treats full containment as partial", () => {
    expect(scoreNameMatch("John Smith", "John Michael Smith")).toBe("partial");
  });
  it("treats unrelated names as none", () => {
    expect(scoreNameMatch("John Smith", "Mary Jones")).toBe("none");
  });
});

describe("matchVehicle", () => {
  it("passes regardless of spacing/case", () => {
    expect(matchVehicle(validExtraction({ vehicleRegistration: "ab12cde" }), tmcRecord()).status).toBe(
      CheckStatus.PASS,
    );
  });
  it("rejects a missing registration", () => {
    const r = matchVehicle(validExtraction({ vehicleRegistration: null }), tmcRecord());
    expect(r).toMatchObject(check(CheckName.VEHICLE_MATCH, CheckStatus.FAIL, "VEHICLE_REG_MISSING"));
  });
  it("rejects a mismatch", () => {
    const r = matchVehicle(validExtraction({ vehicleRegistration: "ZZ99 ZZZ" }), tmcRecord());
    expect(r).toMatchObject(check(CheckName.VEHICLE_MATCH, CheckStatus.FAIL, "VEHICLE_NO_MATCH"));
  });
});

describe("checkBusinessUse", () => {
  it("passes explicit business use", () => {
    expect(checkBusinessUse(validExtraction()).status).toBe(CheckStatus.PASS);
  });
  it("reviews ambiguous usage", () => {
    expect(
      checkBusinessUse(validExtraction({ businessUseStated: BusinessUseStatement.UNCLEAR })).status,
    ).toBe(CheckStatus.REVIEW);
  });
  it("rejects SDP-only as not permitted", () => {
    const r = checkBusinessUse(
      validExtraction({
        businessUseStated: BusinessUseStatement.NO,
        permittedUsageText: "Social, Domestic & Pleasure only",
      }),
    );
    expect(r).toMatchObject(check(CheckName.BUSINESS_USE, CheckStatus.FAIL, "USAGE_BUSINESS_NOT_PERMITTED"));
  });
  it("rejects when usage is not stated", () => {
    const r = checkBusinessUse(
      validExtraction({ businessUseStated: BusinessUseStatement.NO, permittedUsageText: null }),
    );
    expect(r).toMatchObject(check(CheckName.BUSINESS_USE, CheckStatus.FAIL, "USAGE_MISSING"));
  });
});

describe("checkValidity", () => {
  it("passes a current policy (end date inclusive)", () => {
    expect(checkValidity(validExtraction({ policyEndDate: TODAY }), TODAY).status).toBe(CheckStatus.PASS);
  });
  it("rejects an expired policy", () => {
    const r = checkValidity(validExtraction({ policyEndDate: "2026-01-01" }), TODAY);
    expect(r).toMatchObject(check(CheckName.POLICY_VALIDITY, CheckStatus.FAIL, "POLICY_EXPIRED"));
  });
  it("reviews a future-dated policy", () => {
    const r = checkValidity(validExtraction({ policyStartDate: "2026-12-01" }), TODAY);
    expect(r.status).toBe(CheckStatus.REVIEW);
  });
  it("rejects missing dates", () => {
    const r = checkValidity(validExtraction({ policyStartDate: null }), TODAY);
    expect(r).toMatchObject(check(CheckName.POLICY_VALIDITY, CheckStatus.FAIL, "POLICY_DATES_MISSING"));
  });
});
