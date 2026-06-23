import { CheckName, CheckStatus } from "../constants";
import { normaliseRegistration } from "../normalise";
import type { CertificateExtraction } from "../extraction.schema";
import type { CheckResult, TmcRecord } from "../types";

/**
 * Registration is the primary vehicle identifier. Missing reg is a mandatory
 * field failure; a present-but-different reg is a mismatch rejection.
 */
export function matchVehicle(
  extraction: CertificateExtraction,
  tmc: TmcRecord,
): CheckResult {
  if (!extraction.vehicleRegistration) {
    return {
      name: CheckName.VEHICLE_MATCH,
      status: CheckStatus.FAIL,
      reasonCode: "VEHICLE_REG_MISSING",
      detail: "No vehicle registration found on the document.",
    };
  }

  const found = normaliseRegistration(extraction.vehicleRegistration);
  const expected = normaliseRegistration(tmc.vehicleRegistration);

  if (found === expected) {
    return {
      name: CheckName.VEHICLE_MATCH,
      status: CheckStatus.PASS,
      detail: `Registration ${extraction.vehicleRegistration} matches TMC record ${tmc.vehicleRegistration}.`,
    };
  }

  return {
    name: CheckName.VEHICLE_MATCH,
    status: CheckStatus.FAIL,
    reasonCode: "VEHICLE_NO_MATCH",
    detail: `Registration ${extraction.vehicleRegistration} does not match TMC record ${tmc.vehicleRegistration}.`,
  };
}
