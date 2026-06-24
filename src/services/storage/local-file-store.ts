import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { SupportedMediaType } from "../extraction/extractor";
import type { FileStore, StoredFile } from "./file-store";

const EXTENSION: Record<SupportedMediaType, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Development adapter: writes uploads to a local ./uploads directory. */
export class LocalFileStore implements FileStore {
  constructor(private readonly dir = join(process.cwd(), "uploads")) {}

  async put(params: {
    key: string;
    bytes: Buffer;
    mediaType: SupportedMediaType;
  }): Promise<StoredFile> {
    await mkdir(this.dir, { recursive: true });
    const name = `${params.key}.${EXTENSION[params.mediaType]}`;
    await writeFile(join(this.dir, name), params.bytes);
    return { location: join("uploads", name) };
  }
}
