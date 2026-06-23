import { loadEnv } from "@/lib/env";
import { prisma } from "@/lib/db";
import { createExtractor } from "./extraction/factory";
import { SeedTmcClient } from "./tmc/seed-tmc-client";
import type { PipelineDeps } from "./pipeline";

/**
 * Compose the production pipeline dependencies from configuration. The TMC
 * adapter is the seed/fixtures client by default; swap it here when the real
 * TMC API client exists.
 */
export async function buildPipelineDeps(): Promise<PipelineDeps> {
  const env = loadEnv();
  const { extractor, mode } = createExtractor();
  const tmc = await SeedTmcClient.fromFixtures();
  return {
    db: prisma,
    tmc,
    extractor,
    extractionMode: mode,
    confidenceThreshold: env.CONFIDENCE_THRESHOLD,
    now: () => new Date(),
  };
}
