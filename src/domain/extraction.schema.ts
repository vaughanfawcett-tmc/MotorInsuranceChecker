import { z } from "zod";
import { DocumentType } from "./constants";

/**
 * Structured data the extraction layer must return for any submitted document.
 * This is the boundary contract with the vision model: every field is validated
 * with Zod before it reaches the validation engine. The model is never trusted
 * to return well-formed data.
 */

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD")
  .nullable();

const confidence = z.number().min(0).max(1);

/** Whether the document explicitly permits business use. */
export const BusinessUseStatement = {
  YES: "yes",
  NO: "no",
  UNCLEAR: "unclear",
} as const;
export type BusinessUseStatement =
  (typeof BusinessUseStatement)[keyof typeof BusinessUseStatement];

export const certificateExtractionSchema = z.object({
  /** Best-guess classification of the document. */
  documentType: z.nativeEnum(DocumentType),
  documentTypeConfidence: confidence,

  /** False when the scan is too poor to read reliably. */
  legible: z.boolean(),
  /** True if the model sees signs of editing/tampering (fonts, overlays). */
  signsOfTampering: z.boolean(),

  /** Named policyholder, verbatim, or null if absent. */
  policyholderName: z.string().min(1).nullable(),
  /** All driver names found (may include the policyholder). */
  driverNames: z.array(z.string().min(1)),

  /** Primary vehicle registration, normalised casing left to the engine. */
  vehicleRegistration: z.string().min(1).nullable(),
  vehicleMakeModel: z.string().min(1).nullable(),

  /** Verbatim usage wording, plus the model's structured judgement. */
  permittedUsageText: z.string().min(1).nullable(),
  businessUseStated: z.nativeEnum(BusinessUseStatement),

  policyNumber: z.string().min(1).nullable(),
  insurerName: z.string().min(1).nullable(),

  policyStartDate: isoDate,
  policyEndDate: isoDate,

  /** Overall confidence in the extraction as a whole. */
  overallConfidence: confidence,
  /** Free-text caveats or reasoning from the model. */
  notes: z.string().nullable(),
});

export type CertificateExtraction = z.infer<typeof certificateExtractionSchema>;
