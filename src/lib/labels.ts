import { CheckName, Decision } from "@/domain/constants";

/** Display labels (British English) for the dashboard. */
export const decisionLabel: Record<Decision, string> = {
  [Decision.APPROVED]: "Approved",
  [Decision.REJECTED]: "Rejected",
  [Decision.MANUAL_REVIEW]: "Manual review",
};

export const checkLabel: Record<CheckName, string> = {
  [CheckName.DOCUMENT_TYPE]: "Document type",
  [CheckName.DRIVER_MATCH]: "Driver match",
  [CheckName.VEHICLE_MATCH]: "Vehicle match",
  [CheckName.BUSINESS_USE]: "Business use",
  [CheckName.POLICY_VALIDITY]: "Policy validity",
};

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDateTime(date: Date): string {
  return dateFmt.format(date);
}
