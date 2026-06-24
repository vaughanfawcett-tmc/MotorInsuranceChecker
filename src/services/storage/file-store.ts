import type { SupportedMediaType } from "../extraction/extractor";

export interface StoredFile {
  /** Where the file lives: a local path (dev) or a Blob URL (prod). */
  readonly location: string;
}

/**
 * Port for persisting the original uploaded document. Two adapters: local disk
 * for development, Vercel Blob for serverless production. The validation logic
 * never touches this; only the pipeline does.
 */
export interface FileStore {
  /** Persist bytes under a content-addressed name; return where it was stored. */
  put(params: {
    key: string;
    bytes: Buffer;
    mediaType: SupportedMediaType;
  }): Promise<StoredFile>;
}
