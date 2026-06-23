/**
 * Manual smoke test: runs a real document through the OpenAI extractor.
 * Usage: node --env-file=.env --import tsx scripts/smoke-openai.ts <file>
 * Not part of the automated suite (it makes a billed API call).
 */
import { readFileSync } from "node:fs";
import { OpenAIExtractor } from "../src/services/extraction/openai-extractor";
import { isSupportedMediaType } from "../src/services/extraction/extractor";

async function main(): Promise<void> {
  const path = process.argv[2];
  if (!path) throw new Error("Provide a file path");
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const mediaType = path.endsWith(".pdf")
    ? "application/pdf"
    : path.endsWith(".png")
      ? "image/png"
      : "image/jpeg";
  if (!isSupportedMediaType(mediaType)) throw new Error("unsupported");

  const extractor = new OpenAIExtractor(apiKey, process.env.OPENAI_MODEL ?? "gpt-4o");
  const result = await extractor.extract({
    bytes: readFileSync(path),
    mediaType,
  });
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("SMOKE FAILED:", error instanceof Error ? error.message : error);
  process.exit(1);
});
