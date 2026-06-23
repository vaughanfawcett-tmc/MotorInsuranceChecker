import Anthropic from "@anthropic-ai/sdk";
import {
  certificateExtractionSchema,
  type CertificateExtraction,
} from "@/domain/extraction.schema";
import { DocumentType } from "@/domain/constants";
import { BusinessUseStatement } from "@/domain/extraction.schema";
import type { DocumentInput, Extractor } from "./extractor";

const TOOL_NAME = "record_certificate";

const SYSTEM_PROMPT = `You are the extraction step of a UK Certificate of Motor Insurance validation system.
You are given a single uploaded document. Read it carefully (OCR if needed) and call the
${TOOL_NAME} tool with structured data. Rules:
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
- Confidence fields are 0..1. Be honest: low confidence routes a document to a human reviewer.
- Never invent values. If a field is absent, use null (or an empty list for driverNames).`;

// Hand-written JSON Schema kept in lock-step with certificateExtractionSchema.
const TOOL_INPUT_SCHEMA = {
  type: "object" as const,
  properties: {
    documentType: { type: "string", enum: Object.values(DocumentType) },
    documentTypeConfidence: { type: "number", minimum: 0, maximum: 1 },
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
    policyStartDate: { type: ["string", "null"], description: "YYYY-MM-DD or null" },
    policyEndDate: { type: ["string", "null"], description: "YYYY-MM-DD or null" },
    overallConfidence: { type: "number", minimum: 0, maximum: 1 },
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
};

function documentBlock(input: DocumentInput): Anthropic.ContentBlockParam {
  const data = input.bytes.toString("base64");
  if (input.mediaType === "application/pdf") {
    return {
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data },
    };
  }
  return {
    type: "image",
    source: { type: "base64", media_type: input.mediaType, data },
  };
}

/** Claude vision adapter: combined OCR + structured extraction in one call. */
export class ClaudeExtractor implements Extractor {
  private readonly client: Anthropic;

  constructor(
    apiKey: string,
    private readonly model: string,
  ) {
    this.client = new Anthropic({ apiKey });
  }

  async extract(input: DocumentInput): Promise<CertificateExtraction> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: [
        {
          name: TOOL_NAME,
          description: "Record the structured fields extracted from the document.",
          input_schema: TOOL_INPUT_SCHEMA,
        },
      ],
      tool_choice: { type: "tool", name: TOOL_NAME },
      messages: [
        {
          role: "user",
          content: [
            documentBlock(input),
            { type: "text", text: "Extract the certificate fields." },
          ],
        },
      ],
    });

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );
    if (!toolUse) {
      throw new Error("Extraction failed: model did not return structured output.");
    }

    // The model's output is untrusted input; validate at the boundary.
    return certificateExtractionSchema.parse(toolUse.input);
  }
}
