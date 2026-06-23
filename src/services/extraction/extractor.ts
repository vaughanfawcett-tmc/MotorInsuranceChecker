import type { CertificateExtraction } from "@/domain/extraction.schema";

/** Media types the extraction layer accepts. */
export const SUPPORTED_MEDIA_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export type SupportedMediaType = (typeof SUPPORTED_MEDIA_TYPES)[number];

export function isSupportedMediaType(value: string): value is SupportedMediaType {
  return (SUPPORTED_MEDIA_TYPES as readonly string[]).includes(value);
}

/** Maximum accepted upload size, enforced at every intake boundary. */
export const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 MB

export interface DocumentInput {
  readonly bytes: Buffer;
  readonly mediaType: SupportedMediaType;
}

/** Which extraction backend produced a result. Recorded on each submission. */
export type ExtractionMode = "openai" | "claude" | "mock";

/**
 * Port for the OCR + structured-extraction layer. The Claude adapter reads real
 * documents; the mock adapter returns deterministic data for tests/dev.
 */
export interface Extractor {
  extract(input: DocumentInput): Promise<CertificateExtraction>;
}
