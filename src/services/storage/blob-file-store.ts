import { put } from "@vercel/blob";
import type { SupportedMediaType } from "../extraction/extractor";
import type { FileStore, StoredFile } from "./file-store";

const EXTENSION: Record<SupportedMediaType, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Production adapter: stores uploads in Vercel Blob. Requires the
 * BLOB_READ_WRITE_TOKEN env var (set automatically when a Blob store is linked
 * to the Vercel project). Files are private by default; the stored URL is what
 * we persist on the submission.
 */
export class BlobFileStore implements FileStore {
  constructor(private readonly token: string) {}

  async put(params: {
    key: string;
    bytes: Buffer;
    mediaType: SupportedMediaType;
  }): Promise<StoredFile> {
    const name = `certificates/${params.key}.${EXTENSION[params.mediaType]}`;
    const result = await put(name, params.bytes, {
      access: "public",
      contentType: params.mediaType,
      token: this.token,
      // Same content hash => same object; avoid duplicate uploads erroring.
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return { location: result.url };
  }
}
