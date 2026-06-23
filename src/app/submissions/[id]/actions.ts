"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { Decision } from "@/domain/constants";
import { recordReview } from "@/services/submissions";

/** Record a reviewer's manual approve/reject decision. */
export async function submitReview(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");

  const submissionId = String(formData.get("submissionId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  const target =
    decision === Decision.APPROVED
      ? Decision.APPROVED
      : decision === Decision.REJECTED
        ? Decision.REJECTED
        : null;
  if (!submissionId || !target) {
    redirect(`/submissions/${submissionId}?error=invalid`);
  }

  const result = await recordReview({
    submissionId,
    decision: target,
    note,
    actor: session.sub,
  });
  if (!result.ok) {
    redirect(`/submissions/${submissionId}?error=${encodeURIComponent(result.error ?? "failed")}`);
  }
  revalidatePath(`/submissions/${submissionId}`);
  redirect(`/submissions/${submissionId}`);
}
