import { loadEnv } from "@/lib/env";
import { prisma } from "@/lib/db";
import { createExtractor } from "./extraction/factory";
import { createFileStore } from "./storage/factory";
import { SeedTmcClient } from "./tmc/seed-tmc-client";
import type { TmcClient } from "./tmc/tmc-client";
import type { PipelineDeps } from "./pipeline";

/**
 * Compose the production pipeline dependencies from configuration. The TMC
 * adapter is the seed/fixtures client by default; pass `overrides.tmc` to match
 * against an explicit record (e.g. the driver+reg carried in a signed upload
 * link, where no TMC lookup is needed).
 */
export async function buildPipelineDeps(
  overrides: { tmc?: TmcClient } = {},
): Promise<PipelineDeps> {
  const env = loadEnv();
  const { extractor, mode } = createExtractor();
  const tmc = overrides.tmc ?? (await SeedTmcClient.fromFixtures());
  return {
    db: prisma,
    tmc,
    extractor,
    extractionMode: mode,
    fileStore: createFileStore(),
    confidenceThreshold: env.CONFIDENCE_THRESHOLD,
    now: () => new Date(),
  };
}
