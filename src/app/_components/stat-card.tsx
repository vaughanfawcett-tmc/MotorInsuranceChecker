import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  Icon,
  accent,
}: {
  label: string;
  value: number;
  Icon: LucideIcon;
  accent?: "emerald" | "amber" | "red" | "neutral";
}) {
  const tone =
    accent === "emerald"
      ? "text-emerald-600"
      : accent === "amber"
        ? "text-amber-600"
        : accent === "red"
          ? "text-red-600"
          : "text-zinc-400";

  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          {label}
        </span>
        <Icon className={`size-4 ${tone}`} strokeWidth={2} />
      </div>
      <div className="mt-2 text-3xl font-semibold tnum">{value}</div>
    </div>
  );
}
