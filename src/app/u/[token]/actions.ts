"use server";

import { redirect } from "next/navigation";
import { verifyUploadToken } from "@/lib/upload-link";
import {
  isSupportedMediaType,
  MAX_FILE_BYTES,
} from "@/services/extraction/extractor";
import { buildPipelineDeps } from "@/services/runtime";
import { processSubmission } from "@/services/pipeline";
import { SeedTmcClient } from "@/services/tmc/seed-tmc-client";

function fail(token: string, message: string): never {
  redirect(`/u/${token}?error=${encodeURIComponent(message)}`);
}

/**
 * Driver-facing upload. The signed token both authorises the upload and carries
 * the expected driver + registration to match against, so no login and no TMC
 * lookup are needed. The token is re-verified here; the client is never trusted.
 */
export async function uploadViaLink(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  const payload = verifyUploadToken(token);
  if (!payload) redirect(`/u/${token}?expired=1`);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    fail(token, "Please choose a file to upload.");
  }
  if (!isSupportedMediaType(file.type)) {
    fail(token, "Unsupported file type. Please upload a PDF, JPEG, PNG or WEBP.");
  }
  if (file.size > MAX_FILE_BYTES) {
    fail(token, "That file is too large. The limit is 15 MB.");
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  let submissionId: string;
  try {
    // Match against the record carried in the link, not a TMC lookup.
    const tmc = SeedTmcClient.fromRecords([
      {
        reference: payload.reference,
        driverName: payload.driverName,
        vehicleRegistration: payload.vehicleRegistration,
        vehicleMakeModel: payload.vehicleMakeModel ?? null,
      },
    ]);
    const deps = await buildPipelineDeps({ tmc });
    const result = await processSubmission(deps, {
      tmcReference: payload.reference,
      filename: file.name || "upload",
      mediaType: file.type,
      bytes,
    });
    submissionId = result.submissionId;
  } catch (error) {
    console.error("Link upload error:", error);
    fail(token, "Something went wrong checking the document. Please try again.");
  }

  redirect(`/u/${token}?done=${submissionId}`);
}
