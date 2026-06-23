import { z } from "zod";
import type {
  CheckName,
  CheckStatus,
  Decision,
  RejectionReasonCode,
} from "./constants";

/**
 * The authoritative driver/vehicle record held by the TMC system. In the
 * default seed adapter this comes from a fixtures file; a real adapter would
 * fetch it from the TMC API. The extracted document is validated against this.
 */
export const tmcRecordSchema = z.object({
  /** Stable identifier supplied with each submission (e.g. employee/driver id). */
  reference: z.string().min(1),
  /** Expected driver/policyholder full name. */
  driverName: z.string().min(1),
  /** Expected vehicle registration. */
  vehicleRegistration: z.string().min(1),
  /** Optional expected make/model for a secondary cross-check. */
  vehicleMakeModel: z.string().min(1).nullable().optional(),
});

export type TmcRecord = z.infer<typeof tmcRecordSchema>;

/** Result of a single validation check. */
export interface CheckResult {
  readonly name: CheckName;
  readonly status: CheckStatus;
  /** Set when the check fails and maps to a rejection reason. */
  readonly reasonCode?: RejectionReasonCode;
  /** Human-readable explanation for reviewers and the audit log. */
  readonly detail: string;
}

/** Combined outcome across all checks. */
export interface ValidationResult {
  readonly decision: Decision;
  readonly checks: readonly CheckResult[];
  /** Distinct rejection reason codes (only populated when REJECTED). */
  readonly rejectionReasons: readonly RejectionReasonCode[];
}
