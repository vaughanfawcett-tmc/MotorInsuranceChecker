/**
 * Pure normalisation helpers used by the matching engine. Keeping these
 * separate and pure means name/registration comparison rules are testable in
 * isolation and consistent across driver and vehicle checks.
 */

const NAME_TITLES = new Set([
  "mr",
  "mrs",
  "ms",
  "miss",
  "mx",
  "dr",
  "prof",
  "sir",
]);

/** Uppercase, strip everything except A-Z and 0-9. UK registration friendly. */
export function normaliseRegistration(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * Lowercase, strip punctuation and titles, collapse whitespace. Returns a
 * canonical string and the set of name tokens for partial-match logic.
 */
export function normaliseName(input: string): {
  canonical: string;
  tokens: string[];
} {
  const cleaned = input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining accent marks
    .replace(/[^a-z\s'-]/g, " ")
    .replace(/[-']/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const tokens = cleaned.split(" ").filter((t) => t && !NAME_TITLES.has(t));
  return { canonical: tokens.join(" "), tokens };
}
