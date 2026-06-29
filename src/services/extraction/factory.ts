import { loadEnv } from "@/lib/env";
import { ClaudeExtractor } from "./claude-extractor";
import { OpenAIExtractor } from "./openai-extractor";
import { MockExtractor } from "./mock-extractor";
import type { Extractor, ExtractionMode } from "./extractor";

/**
 * Choose the extractor based on configuration. Precedence: Azure OpenAI, then
 * OpenAI, then Anthropic, then the deterministic mock. The chosen mode is
 * recorded on each submission so reviewers know whether (and how) a document
 * was actually read.
 */
export function createExtractor(): { extractor: Extractor; mode: ExtractionMode } {
  const env = loadEnv();
  if (
    env.AZURE_OPENAI_ENDPOINT &&
    env.AZURE_OPENAI_API_KEY &&
    env.AZURE_OPENAI_DEPLOYMENT
  ) {
    return {
      extractor: OpenAIExtractor.forAzure({
        endpoint: env.AZURE_OPENAI_ENDPOINT,
        apiKey: env.AZURE_OPENAI_API_KEY,
        deployment: env.AZURE_OPENAI_DEPLOYMENT,
        apiVersion: env.AZURE_OPENAI_API_VERSION,
      }),
      mode: "azure",
    };
  }
  if (env.OPENAI_API_KEY) {
    return {
      extractor: OpenAIExtractor.forOpenAI(env.OPENAI_API_KEY, env.OPENAI_MODEL),
      mode: "openai",
    };
  }
  if (env.ANTHROPIC_API_KEY) {
    return {
      extractor: new ClaudeExtractor(env.ANTHROPIC_API_KEY, env.ANTHROPIC_MODEL),
      mode: "claude",
    };
  }
  return { extractor: new MockExtractor(), mode: "mock" };
}
