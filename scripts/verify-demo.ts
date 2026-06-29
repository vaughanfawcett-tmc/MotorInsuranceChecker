/**
 * Verifies the generated demo documents produce the decisions they claim.
 * Run: node --env-file=.env --import tsx scripts/verify-demo.ts
 * Makes real extraction calls; not part of the automated suite.
 */
import { readFileSync } from "node:fs";
import { OpenAIExtractor } from "../src/services/extraction/openai-extractor";
import { SeedTmcClient } from "../src/services/tmc/seed-tmc-client";
import { validateCertificate } from "../src/domain/validate";

const FILES = ["pass-john-smith.pdf", "fail-john-smith.pdf", "notcert-invoice.pdf"];

async function main(): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const tmc = await SeedTmcClient.fromFixtures();
  const record = await tmc.getRecord("EMP-001");
  if (!record) throw new Error("EMP-001 fixture missing");

  const extractor = OpenAIExtractor.forOpenAI(apiKey, process.env.OPENAI_MODEL ?? "gpt-4o");

  for (const file of FILES) {
    const bytes = readFileSync(new URL(`../demo/${file}`, import.meta.url));
    const extraction = await extractor.extract({ bytes, mediaType: "application/pdf" });
    const result = validateCertificate({
      extraction,
      tmc: record,
      asOf: "2026-06-23",
      confidenceThreshold: 0.7,
    });
    // eslint-disable-next-line no-console
    console.log(
      `${file.padEnd(24)} -> ${result.decision}` +
        (result.rejectionReasons.length
          ? `  [${result.rejectionReasons.join(", ")}]`
          : ""),
    );
  }
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("VERIFY FAILED:", error instanceof Error ? error.message : error);
  process.exit(1);
});
