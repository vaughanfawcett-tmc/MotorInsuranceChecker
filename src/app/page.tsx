import Link from "next/link";
import { redirect } from "next/navigation";
import { Layers, Clock, CheckCircle2, XCircle, FileText } from "lucide-react";
import { getSession } from "@/lib/auth";
import { Decision } from "@/domain/constants";
import { decisionLabel, formatDateTime } from "@/lib/labels";
import { countByStatus, listSubmissions } from "@/services/submissions";
import { AppShell } from "./_components/app-shell";
import { StatCard } from "./_components/stat-card";
import { StatusBadge } from "./_components/badges";

const FILTERS: { key: string; label: string; status?: Decision }[] = [
  { key: "all", label: "All" },
  { key: "manual_review", label: "Manual review", status: Decision.MANUAL_REVIEW },
  { key: "approved", label: "Approved", status: Decision.APPROVED },
  { key: "rejected", label: "Rejected", status: Decision.REJECTED },
];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  if (!(await getSession())) redirect("/login");

  const { status: statusParam } = await searchParams;
  const active = FILTERS.find((f) => f.key === statusParam) ?? FILTERS[0]!;

  const [submissions, counts] = await Promise.all([
    listSubmissions(active.status),
    countByStatus(),
  ]);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <AppShell active="submissions">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <header className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight">Submissions</h1>
          <p className="text-muted">
            Certificate of Motor Insurance checks and their outcomes.
          </p>
        </header>

        <div className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total" value={total} Icon={Layers} accent="neutral" />
          <StatCard
            label={decisionLabel.MANUAL_REVIEW}
            value={counts[Decision.MANUAL_REVIEW] ?? 0}
            Icon={Clock}
            accent="amber"
          />
          <StatCard
            label={decisionLabel.APPROVED}
            value={counts[Decision.APPROVED] ?? 0}
            Icon={CheckCircle2}
            accent="emerald"
          />
          <StatCard
            label={decisionLabel.REJECTED}
            value={counts[Decision.REJECTED] ?? 0}
            Icon={XCircle}
            accent="red"
          />
        </div>

        <div className="mb-4 inline-flex gap-1 rounded-lg border border-line bg-surface p-1">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={f.key === "all" ? "/" : `/?status=${f.key}`}
              className={[
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                f.key === active.key
                  ? "bg-zinc-100 text-ink"
                  : "text-muted hover:text-ink",
              ].join(" ")}
            >
              {f.label}
            </Link>
          ))}
        </div>

        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          {submissions.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
              <FileText className="size-6 text-zinc-300" />
              <p className="text-muted">No submissions in this view.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-medium">Reference</th>
                  <th className="px-4 py-3 font-medium">File</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Received</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-line last:border-0 hover:bg-zinc-50/70"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/submissions/${s.id}`}
                        className="font-mono text-[13px] font-medium text-ink hover:text-accent"
                      >
                        {s.tmcReference}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/submissions/${s.id}`}
                        className="text-zinc-600 hover:text-ink"
                      >
                        {s.originalFilename}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-4 py-3 text-right text-muted tnum">
                      {formatDateTime(s.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppShell>
  );
}
