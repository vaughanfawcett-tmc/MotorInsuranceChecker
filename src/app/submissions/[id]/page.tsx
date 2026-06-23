import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Info, CircleCheck, CircleX } from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  CheckName,
  CheckStatus,
  Decision,
  RejectionReason,
} from "@/domain/constants";
import { BusinessUseStatement } from "@/domain/extraction.schema";
import { checkLabel, formatDateTime } from "@/lib/labels";
import {
  getAuditTrail,
  getSubmission,
  type SubmissionView,
} from "@/services/submissions";
import { SeedTmcClient } from "@/services/tmc/seed-tmc-client";
import type { TmcRecord } from "@/domain/types";
import { AppShell } from "../../_components/app-shell";
import { CheckBadge, StatusBadge } from "../../_components/badges";
import { submitReview } from "./actions";

function Field({
  k,
  v,
  mismatch,
}: {
  k: string;
  v: string | null | undefined;
  mismatch?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line py-2 last:border-0">
      <span className="text-muted">{k}</span>
      <span
        className={`text-right font-medium ${mismatch ? "text-red-600" : "text-ink"}`}
      >
        {v || "—"}
      </span>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
        {title}
      </h2>
      {children}
    </section>
  );
}

const businessUseLabel: Record<BusinessUseStatement, string> = {
  [BusinessUseStatement.YES]: "Permitted",
  [BusinessUseStatement.NO]: "Not permitted",
  [BusinessUseStatement.UNCLEAR]: "Unclear",
};

function checkByName(s: SubmissionView, name: CheckName) {
  return s.checks.find((c) => c.name === name);
}

export default async function SubmissionDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await getSession())) redirect("/login");

  const { id } = await params;
  const submission = await getSubmission(id);
  if (!submission) notFound();

  const [audit, tmcRecord] = await Promise.all([
    getAuditTrail(id),
    SeedTmcClient.fromFixtures().then((c): Promise<TmcRecord | null> =>
      c.getRecord(submission.tmcReference),
    ),
  ]);

  const ex = submission.extraction;
  const driverFailed =
    checkByName(submission, CheckName.DRIVER_MATCH)?.status === CheckStatus.FAIL;
  const vehicleFailed =
    checkByName(submission, CheckName.VEHICLE_MATCH)?.status === CheckStatus.FAIL;

  return (
    <AppShell active="submissions">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <Link
          href="/"
          className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"
        >
          <ArrowLeft className="size-4" /> Back to submissions
        </Link>

        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-mono text-xl font-semibold tracking-tight">
              {submission.tmcReference}
            </h1>
            <p className="text-muted">
              {submission.originalFilename} · received{" "}
              <span className="tnum">{formatDateTime(submission.createdAt)}</span>
            </p>
          </div>
          <StatusBadge status={submission.status} />
        </div>

        {submission.extractionMode === "mock" ? (
          <Banner>
            Mock extraction: this document was not actually read (no extraction
            provider key configured). Fields below are placeholder data.
          </Banner>
        ) : null}
        {submission.reviewNote ? (
          <Banner>Note: {submission.reviewNote}</Banner>
        ) : null}

        <div className="mb-4 grid gap-4 md:grid-cols-2">
          <Section title="Extracted from document">
            <Field k="Document type" v={ex?.documentType} />
            <Field k="Policyholder" v={ex?.policyholderName} />
            <Field k="Drivers" v={ex?.driverNames.join(", ")} />
            <Field k="Registration" v={ex?.vehicleRegistration} />
            <Field k="Make / model" v={ex?.vehicleMakeModel} />
            <Field
              k="Business use"
              v={ex ? businessUseLabel[ex.businessUseStated] : null}
            />
            <Field k="Usage wording" v={ex?.permittedUsageText} />
            <Field k="Policy number" v={ex?.policyNumber} />
            <Field k="Insurer" v={ex?.insurerName} />
            <Field k="Cover start" v={ex?.policyStartDate} />
            <Field k="Cover end" v={ex?.policyEndDate} />
            <Field
              k="Confidence"
              v={ex ? `${Math.round(ex.overallConfidence * 100)}%` : null}
            />
          </Section>

          <Section title="TMC record">
            {tmcRecord ? (
              <>
                <Field k="Reference" v={tmcRecord.reference} />
                <Field k="Driver" v={tmcRecord.driverName} mismatch={driverFailed} />
                <Field
                  k="Registration"
                  v={tmcRecord.vehicleRegistration}
                  mismatch={vehicleFailed}
                />
                <Field k="Make / model" v={tmcRecord.vehicleMakeModel ?? "—"} />
              </>
            ) : (
              <p className="text-muted">
                No TMC record found for this reference. Automatic matching could
                not be performed.
              </p>
            )}
          </Section>
        </div>

        <div className="mb-4">
          <Section title="Validation checks">
            {submission.checks.length === 0 ? (
              <p className="text-muted">
                No automated checks were run (extraction or lookup did not
                complete).
              </p>
            ) : (
              <div className="divide-y divide-line">
                {submission.checks.map((c) => (
                  <div key={c.name} className="flex gap-3 py-2.5">
                    <CheckBadge status={c.status} />
                    <div className="min-w-0">
                      <div className="font-medium">
                        {checkLabel[c.name as CheckName] ?? c.name}
                      </div>
                      <div className="text-muted">{c.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

        {submission.rejectionReasons.length > 0 ? (
          <div className="mb-4">
            <Section title="Rejection reasons">
              <ul className="space-y-2">
                {submission.rejectionReasons.map((code) => {
                  const def = RejectionReason[code];
                  return (
                    <li
                      key={code}
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700"
                    >
                      <div className="font-medium">{def?.label ?? code}</div>
                      {def ? (
                        <div className="text-xs text-red-600/80">
                          {def.category}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </Section>
          </div>
        ) : null}

        {submission.status === Decision.MANUAL_REVIEW ? (
          <div className="mb-4">
            <Section title="Manual review">
              <form action={submitReview} className="space-y-3">
                <input type="hidden" name="submissionId" value={submission.id} />
                <label htmlFor="note" className="block text-sm text-muted">
                  Reviewer note (recorded in the audit log)
                </label>
                <textarea
                  id="note"
                  name="note"
                  rows={3}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
                <div className="flex gap-2.5">
                  <button
                    type="submit"
                    name="decision"
                    value={Decision.APPROVED}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                  >
                    <CircleCheck className="size-4" /> Approve
                  </button>
                  <button
                    type="submit"
                    name="decision"
                    value={Decision.REJECTED}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                  >
                    <CircleX className="size-4" /> Reject
                  </button>
                </div>
              </form>
            </Section>
          </div>
        ) : submission.reviewedBy ? (
          <div className="mb-4">
            <Section title="Manual review">
              <p className="text-muted">
                {submission.status === Decision.APPROVED
                  ? "Approved"
                  : "Rejected"}{" "}
                by {submission.reviewedBy}
                {submission.reviewedAt
                  ? ` on ${formatDateTime(submission.reviewedAt)}`
                  : ""}
                .
              </p>
            </Section>
          </div>
        ) : null}

        <Section title="Audit trail">
          <ol className="space-y-0">
            {audit.map((entry, i) => (
              <li key={entry.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="mt-1.5 size-2 rounded-full bg-zinc-300" />
                  {i < audit.length - 1 ? (
                    <span className="w-px flex-1 bg-line" />
                  ) : null}
                </div>
                <div className="pb-4">
                  <div className="text-xs text-zinc-400 tnum">
                    {formatDateTime(entry.createdAt)} · {entry.actor}
                  </div>
                  <div className="font-medium">{entry.action}</div>
                  <div className="text-muted">{entry.detail}</div>
                </div>
              </li>
            ))}
          </ol>
        </Section>
      </div>
    </AppShell>
  );
}

function Banner({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
      <Info className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
