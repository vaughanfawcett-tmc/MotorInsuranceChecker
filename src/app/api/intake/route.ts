import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyIntakeAuth } from "@/lib/auth";
import {
  isSupportedMediaType,
  MAX_FILE_BYTES,
} from "@/services/extraction/extractor";
import { buildPipelineDeps } from "@/services/runtime";
import { processSubmission } from "@/services/pipeline";

export const runtime = "nodejs";

const fieldsSchema = z.object({
  tmcReference: z.string().min(1, "tmcReference is required"),
});

/**
 * Intake endpoint. Authenticated with the shared secret. Accepts a multipart
 * form with `tmcReference` and a `file` (PDF/JPEG/PNG/WEBP). Runs the full
 * validation pipeline and returns the decision.
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!verifyIntakeAuth(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data" },
      { status: 400 },
    );
  }

  const fields = fieldsSchema.safeParse({ tmcReference: form.get("tmcReference") });
  if (!fields.success) {
    return NextResponse.json(
      { error: fields.error.issues[0]?.message ?? "Invalid fields" },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  if (!isSupportedMediaType(file.type)) {
    return NextResponse.json(
      { error: `Unsupported media type: ${file.type || "unknown"}` },
      { status: 415 },
    );
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: "File exceeds 15 MB limit" },
      { status: 413 },
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  try {
    const deps = await buildPipelineDeps();
    const result = await processSubmission(deps, {
      tmcReference: fields.data.tmcReference,
      filename: file.name || "upload",
      mediaType: file.type,
      bytes,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    // Genuine surprise: log server-side, return an opaque 500 (no detail leak).
    console.error("Intake pipeline error:", error);
    return NextResponse.json(
      { error: "Internal error processing submission" },
      { status: 500 },
    );
  }
}
