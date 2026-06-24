import { BlobFileStore } from "./blob-file-store";
import { LocalFileStore } from "./local-file-store";
import type { FileStore } from "./file-store";

/**
 * Choose the file store. If a Blob token is present (production on Vercel), use
 * Blob; otherwise fall back to local disk for development. The token is read
 * here rather than through the Zod env schema because it is injected by the
 * Vercel Blob integration and is optional in local dev.
 */
export function createFileStore(): FileStore {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (token) return new BlobFileStore(token);
  return new LocalFileStore();
}
