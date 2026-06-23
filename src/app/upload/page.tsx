import { redirect } from "next/navigation";
import { UploadCloud, AlertCircle } from "lucide-react";
import { getSession } from "@/lib/auth";
import { AppShell } from "../_components/app-shell";
import { uploadSubmission } from "./actions";

export default async function UploadPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!(await getSession())) redirect("/login");
  const { error } = await searchParams;

  return (
    <AppShell active="upload">
      <div className="mx-auto max-w-2xl px-6 py-8">
        <header className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight">
            Upload a certificate
          </h1>
          <p className="text-muted">
            Submit a Certificate of Motor Insurance for validation. It runs the
            same checks as the intake API and appears in the submissions list.
          </p>
        </header>

        <div className="rounded-xl border border-line bg-surface p-6">
          {error ? (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <form action={uploadSubmission} className="space-y-5">
            <div>
              <label htmlFor="tmcReference" className="mb-1.5 block font-medium">
                TMC reference
              </label>
              <input
                id="tmcReference"
                name="tmcReference"
                type="text"
                placeholder="e.g. EMP-001"
                autoComplete="off"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
              <p className="mt-1.5 text-sm text-muted">
                The driver/vehicle reference used to look up the TMC record.
              </p>
            </div>

            <div>
              <label htmlFor="file" className="mb-1.5 block font-medium">
                Document
              </label>
              <input
                id="file"
                name="file"
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                className="w-full cursor-pointer rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2.5 text-sm"
              />
              <p className="mt-1.5 text-sm text-muted">
                PDF, JPEG, PNG or WEBP, up to 15 MB.
              </p>
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <UploadCloud className="size-4" /> Validate document
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
