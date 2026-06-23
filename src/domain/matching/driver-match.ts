import { CheckName, CheckStatus } from "../constants";
import { normaliseName } from "../normalise";
import type { CertificateExtraction } from "../extraction.schema";
import type { CheckResult, TmcRecord } from "../types";

type NameMatch = "exact" | "partial" | "none";

/**
 * Compare an extracted candidate name against the TMC target name.
 * Conservative by design: only an exact canonical match auto-passes; anything
 * close-but-not-identical is "partial" and routed to a human, per the brief
 * (exact -> pass, partial/unclear -> manual review, no match -> reject).
 */
export function scoreNameMatch(targetRaw: string, candidateRaw: string): NameMatch {
  const target = normaliseName(targetRaw);
  const candidate = normaliseName(candidateRaw);

  if (!target.canonical || !candidate.canonical) return "none";
  if (target.canonical === candidate.canonical) return "exact";

  const [small, large] =
    target.tokens.length <= candidate.tokens.length
      ? [target.tokens, candidate.tokens]
      : [candidate.tokens, target.tokens];

  // One name fully contained in the other (e.g. missing middle name).
  const subset = small.every((t) => large.includes(t));
  if (subset) return "partial";

  // Same surname and same first initial (e.g. "J Smith" vs "John Smith").
  const targetLast = target.tokens[target.tokens.length - 1] ?? "";
  const candidateLast = candidate.tokens[candidate.tokens.length - 1] ?? "";
  const targetFirst = target.tokens[0] ?? "";
  const candidateFirst = candidate.tokens[0] ?? "";
  const lastEqual = targetLast === candidateLast;
  const firstInitialEqual =
    targetFirst.charAt(0) === candidateFirst.charAt(0) && targetFirst !== "";
  if (lastEqual && firstInitialEqual) return "partial";

  return "none";
}

export function matchDriver(
  extraction: CertificateExtraction,
  tmc: TmcRecord,
): CheckResult {
  const candidates = [extraction.policyholderName, ...extraction.driverNames]
    .filter((n): n is string => typeof n === "string" && n.trim().length > 0);

  if (candidates.length === 0) {
    return {
      name: CheckName.DRIVER_MATCH,
      status: CheckStatus.FAIL,
      reasonCode: "DRIVER_MISSING",
      detail: "No policyholder or driver name found on the document.",
    };
  }

  let best: NameMatch = "none";
  let bestCandidate = candidates[0] ?? "";
  for (const candidate of candidates) {
    const score = scoreNameMatch(tmc.driverName, candidate);
    if (score === "exact") {
      best = "exact";
      bestCandidate = candidate;
      break;
    }
    if (score === "partial" && best === "none") {
      best = "partial";
      bestCandidate = candidate;
    }
  }

  if (best === "exact") {
    return {
      name: CheckName.DRIVER_MATCH,
      status: CheckStatus.PASS,
      detail: `Driver "${bestCandidate}" matches TMC record "${tmc.driverName}".`,
    };
  }
  if (best === "partial") {
    return {
      name: CheckName.DRIVER_MATCH,
      status: CheckStatus.REVIEW,
      detail: `Driver "${bestCandidate}" partially matches TMC record "${tmc.driverName}"; needs human confirmation.`,
    };
  }
  return {
    name: CheckName.DRIVER_MATCH,
    status: CheckStatus.FAIL,
    reasonCode: "DRIVER_NO_MATCH",
    detail: `None of the document names (${candidates.join(", ")}) match TMC record "${tmc.driverName}".`,
  };
}
