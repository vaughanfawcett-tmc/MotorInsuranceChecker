import Image from "next/image";
import { CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";
import { Decision, RejectionReason } from "@/domain/constants";
import { verifyUploadToken } from "@/lib/upload-link";
import { getSubmission } from "@/services/submissions";
import { uploadViaLink } from "./actions";

/** Branded standalone frame for the public (driver-facing) flow. */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
        <div className="flex flex-col items-center gap-2 bg-brand-dark px-7 py-7">
          <Image
            src="/brand/tmc-logo-white.png"
            alt="The Miles Consultancy"
            width={170}
            height={89}
            priority
            className="h-10 w-auto"
          />
          <p className="text-sm text-zinc-400">Insurance certificate upload</p>
        </div>
        <div className="p-7">{children}</div>
      </div>
    </div>
  );
}

export default async function PublicUploadPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string; expired?: string; done?: string }>;
}) {
  const { token } = await params;
  const { error, expired, done } = await searchParams;
  const payload = verifyUploadToken(token);

  if (!payload || expired) {
    return (
      <Frame>
        <div className="flex flex-col items-center gap-2 text-center">
          <AlertCircle className="size-7 text-amber-500" />
          <h1 className="text-lg font-semibold">This link is no longer valid</h1>
          <p className="text-muted">
            Your upload link has expired or is invalid. Please contact your
            administrator for a new link.
          </p>
        </div>
      </Frame>
    );
  }

  // Result view after an upload.
  if (done) {
    const submission = await getSubmission(done);
    // Guard: only show a result that belongs to this link's driver.
    if (!submission || submission.tmcReference !== payload.reference) {
      return (
        <Frame>
          <p className="text-muted">We could not find that submission.</p>
        </Frame>
      );
    }
    return (
      <Frame>
        <Result status={submission.status} reasons={submission.rejectionReasons} />
      </Frame>
    );
  }

  // Upload form.
  return (
    <Frame>
      <h1 className="mb-1 text-lg font-semibold">Upload your certificate</h1>
      <p className="mb-5 text-muted">
        Please upload your current Certificate of Motor Insurance. We will check
        it automatically.
      </p>

      <div className="mb-5 rounded-lg border border-line bg-zinc-50 px-4 py-3 text-sm">
        <div className="text-muted">Uploading for</div>
        <div className="font-medium">{payload.driverName}</div>
        <div className="font-mono text-[13px] text-zinc-600">
          {payload.vehicleRegistration}
        </div>
      </div>

      {error ? (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <form action={uploadViaLink} className="space-y-4">
        <input type="hidden" name="token" value={token} />
        <input
          id="file"
          name="file"
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="w-full cursor-pointer rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2.5 text-sm"
        />
        <p className="text-sm text-muted">PDF, JPEG, PNG or WEBP, up to 15 MB.</p>
        <button
          type="submit"
          className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
        >
          Submit certificate
        </button>
      </form>
    </Frame>
  );
}

function Result({
  status,
  reasons,
}: {
  status: Decision;
  reasons: readonly (keyof typeof RejectionReason)[];
}) {
  if (status === Decision.APPROVED) {
    return (
      <div className="flex flex-col items-center gap-2 text-center">
        <CheckCircle2 className="size-8 text-emerald-600" />
        <h1 className="text-lg font-semibold">Certificate accepted</h1>
        <p className="text-muted">
          Thank you. Your Certificate of Motor Insurance has been checked and
          accepted. No further action is needed.
        </p>
      </div>
    );
  }

  if (status === Decision.MANUAL_REVIEW) {
    return (
      <div className="flex flex-col items-center gap-2 text-center">
        <Clock className="size-8 text-amber-500" />
        <h1 className="text-lg font-semibold">Certificate received</h1>
        <p className="text-muted">
          Thank you. Your certificate has been received and is being reviewed.
          We will be in touch if anything further is needed.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <XCircle className="size-8 text-red-600" />
      <h1 className="text-lg font-semibold">We could not accept this document</h1>
      <p className="text-muted">
        There was a problem with the certificate you uploaded:
      </p>
      <ul className="w-full space-y-2 text-left">
        {reasons.map((code) => (
          <li
            key={code}
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {RejectionReason[code]?.label ?? code}
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted">
        Please check your document and contact your administrator if you need a
        new upload link to try again.
      </p>
    </div>
  );
}
