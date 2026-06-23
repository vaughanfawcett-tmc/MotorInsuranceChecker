import {
  CheckCircle2,
  XCircle,
  Clock,
  type LucideIcon,
} from "lucide-react";
import { CheckStatus, Decision } from "@/domain/constants";
import { decisionLabel } from "@/lib/labels";

const decisionStyle: Record<
  Decision,
  { Icon: LucideIcon; cls: string; label: string }
> = {
  [Decision.APPROVED]: {
    Icon: CheckCircle2,
    cls: "text-emerald-700 bg-emerald-50 border-emerald-200",
    label: decisionLabel.APPROVED,
  },
  [Decision.REJECTED]: {
    Icon: XCircle,
    cls: "text-red-700 bg-red-50 border-red-200",
    label: decisionLabel.REJECTED,
  },
  [Decision.MANUAL_REVIEW]: {
    Icon: Clock,
    cls: "text-amber-700 bg-amber-50 border-amber-200",
    label: decisionLabel.MANUAL_REVIEW,
  },
};

export function StatusBadge({ status }: { status: Decision }) {
  const { Icon, cls, label } = decisionStyle[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${cls}`}
    >
      <Icon className="size-3.5" strokeWidth={2.25} />
      {label}
    </span>
  );
}

const checkStyle: Record<CheckStatus, { cls: string; label: string }> = {
  [CheckStatus.PASS]: {
    cls: "text-emerald-700 bg-emerald-50 border-emerald-200",
    label: "Pass",
  },
  [CheckStatus.REVIEW]: {
    cls: "text-amber-700 bg-amber-50 border-amber-200",
    label: "Review",
  },
  [CheckStatus.FAIL]: {
    cls: "text-red-700 bg-red-50 border-red-200",
    label: "Fail",
  },
};

export function CheckBadge({ status }: { status: CheckStatus }) {
  const { cls, label } = checkStyle[status];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}
    >
      {label}
    </span>
  );
}
