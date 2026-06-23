"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import {
  isSupportedMediaType,
  MAX_FILE_BYTES,
} from "@/services/extraction/extractor";
import { buildPipelineDeps } from "@/services/runtime";
import { processSubmission } from "@/services/pipeline";

function fail(message: string): never {
  redirect(`/upload?error=${encodeURIComponent(message)}`);
}

/**
 * Reviewer-initiated upload. Runs the same pipeline as the intake API, then
 * sends the reviewer straight to the resulting submission. Session-guarded.
 */
export async function uploadSubmission(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");

  const tmcReference = String(formData.get("tmcReference") ?? "").trim();
  const file = formData.get("file");

  if (!tmcReference) fail("A TMC reference is required.");
  if (!(file instanceof File) || file.size === 0) fail("Please choose a file.");
  if (!isSupportedMediaType(file.type)) {
    fail(`Unsupported file type: ${file.type || "unknown"}. Use PDF, JPEG, PNG or WEBP.`);
  }
  if (file.size > MAX_FILE_BYTES) fail("File exceeds the 15 MB limit.");

  const mediaType = file.type;
  const bytes = Buffer.from(await file.arrayBuffer());

  let submissionId: string;
  try {
    const deps = await buildPipelineDeps();
    const result = await processSubmission(deps, {
      tmcReference,
      filename: file.name || "upload",
      mediaType,
      bytes,
    });
    submissionId = result.submissionId;
  } catch (error) {
    console.error("Upload pipeline error:", error);
    fail("Something went wrong processing the document. Please try again.");
  }

  revalidatePath("/");
  redirect(`/submissions/${submissionId}`);
}
