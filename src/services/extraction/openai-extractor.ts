import OpenAI from "openai";
import {
  certificateExtractionSchema,
  type CertificateExtraction,
} from "@/domain/extraction.schema";
import { DocumentType } from "@/domain/constants";
import { BusinessUseStatement } from "@/domain/extraction.schema";
import type { DocumentInput, Extractor } from "./extractor";

const SYSTEM_PROMPT = `You are the extraction step of a UK Certificate of Motor Insurance validation system.
You are given a single uploaded document. Read it carefully (OCR if needed) and return structured
data. Rules:
- Transcribe names, registrations, policy numbers and usage wording VERBATIM as they appear.
- Classify the document type. A Certificate of Motor Insurance explicitly says so and lists
  policyholder, vehicle, permitted use and dates. A schedule, quote, cover letter, invoice or
  screenshot is NOT a certificate.
- businessUseStated: "yes" only if business/commercial use is explicitly permitted (e.g.
  "Social, Domestic & Pleasure and Business Use", "Business Use", "SDP + Business").
  "no" if usage is stated but excludes business (e.g. "Social, Domestic & Pleasure only",
  "Commuting only"). "unclear" if usage wording is ambiguous or you cannot tell.
- Dates must be ISO YYYY-MM-DD or null. Convert any UK date format you see.
- legible=false if the scan is too poor to read reliably. signsOfTampering=true if fonts,
  alignment or overlays look edited.
- Confidence fields are between 0 and 1. Be honest: low confidence routes a document to a human.
- Never invent values. If a field is absent, use null (or an empty list for driverNames).`;

// JSON Schema for OpenAI structured outputs (strict mode): every property is
// required and additionalProperties is false. Numeric bounds are omitted (not
// supported in strict mode); ranges are enforced by Zod after parsing.
const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    documentType: { type: "string", enum: Object.values(DocumentType) },
    documentTypeConfidence: { type: "number" },
    legible: { type: "boolean" },
    signsOfTampering: { type: "boolean" },
    policyholderName: { type: ["string", "null"] },
    driverNames: { type: "array", items: { type: "string" } },
    vehicleRegistration: { type: ["string", "null"] },
    vehicleMakeModel: { type: ["string", "null"] },
    permittedUsageText: { type: ["string", "null"] },
    businessUseStated: { type: "string", enum: Object.values(BusinessUseStatement) },
    policyNumber: { type: ["string", "null"] },
    insurerName: { type: ["string", "null"] },
    policyStartDate: { type: ["string", "null"] },
    policyEndDate: { type: ["string", "null"] },
    overallConfidence: { type: "number" },
    notes: { type: ["string", "null"] },
  },
  required: [
    "documentType",
    "documentTypeConfidence",
    "legible",
    "signsOfTampering",
    "policyholderName",
    "driverNames",
    "vehicleRegistration",
    "vehicleMakeModel",
    "permittedUsageText",
    "businessUseStated",
    "policyNumber",
    "insurerName",
    "policyStartDate",
    "policyEndDate",
    "overallConfidence",
    "notes",
  ],
} as const;

/** OpenAI vision adapter: combined OCR + structured extraction via the Responses API. */
export class OpenAIExtractor implements Extractor {
  private readonly client: OpenAI;

  constructor(
    apiKey: string,
    private readonly model: string,
  ) {
    this.client = new OpenAI({ apiKey });
  }

  async extract(input: DocumentInput): Promise<CertificateExtraction> {
    const dataUrl = `data:${input.mediaType};base64,${input.bytes.toString("base64")}`;

    const documentPart =
      input.mediaType === "application/pdf"
        ? ({ type: "input_file", filename: "document.pdf", file_data: dataUrl } as const)
        : ({ type: "input_image", image_url: dataUrl, detail: "high" } as const);

    const response = await this.client.responses.create({
      model: this.model,
      instructions: SYSTEM_PROMPT,
      input: [
        {
          role: "user",
          content: [
            documentPart,
            { type: "input_text", text: "Extract the certificate fields." },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "certificate_extraction",
          schema: RESPONSE_SCHEMA,
          strict: true,
        },
      },
    });

    const text = response.output_text;
    if (!text) {
      throw new Error("Extraction failed: model returned no structured output.");
    }

    // The model's output is untrusted input; validate at the boundary.
    return certificateExtractionSchema.parse(JSON.parse(text));
  }
}
