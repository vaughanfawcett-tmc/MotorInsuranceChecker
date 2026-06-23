import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { tmcRecordSchema } from "@/domain/types";
import type { TmcRecord } from "@/domain/types";
import type { TmcClient } from "./tmc-client";

const recordsSchema = z.array(tmcRecordSchema);

/**
 * Default TMC adapter backed by a fixtures file. Stands in for a real TMC API
 * during development and demos. Records are validated on load and indexed by
 * reference. Replace this class with an HTTP-backed client implementing the
 * same `TmcClient` interface when the real API is available.
 */
export class SeedTmcClient implements TmcClient {
  private constructor(private readonly byReference: Map<string, TmcRecord>) {}

  static async fromFixtures(
    path = join(process.cwd(), "fixtures", "tmc-records.json"),
  ): Promise<SeedTmcClient> {
    const raw = await readFile(path, "utf8");
    const parsed = recordsSchema.parse(JSON.parse(raw));
    const map = new Map<string, TmcRecord>();
    for (const record of parsed) map.set(record.reference, record);
    return new SeedTmcClient(map);
  }

  /** Test/seed helper: build directly from in-memory records. */
  static fromRecords(records: TmcRecord[]): SeedTmcClient {
    return new SeedTmcClient(new Map(records.map((r) => [r.reference, r])));
  }

  getRecord(reference: string): Promise<TmcRecord | null> {
    return Promise.resolve(this.byReference.get(reference) ?? null);
  }
}
