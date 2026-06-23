import { describe, expect, it } from "vitest";
import { normaliseName, normaliseRegistration } from "@/domain/normalise";

describe("normaliseRegistration", () => {
  it("uppercases and strips spaces/punctuation", () => {
    expect(normaliseRegistration("ab12 cde")).toBe("AB12CDE");
    expect(normaliseRegistration("AB12-CDE")).toBe("AB12CDE");
    expect(normaliseRegistration(" ab12cde ")).toBe("AB12CDE");
  });
});

describe("normaliseName", () => {
  it("lowercases, strips titles and punctuation", () => {
    expect(normaliseName("Mr John Smith").canonical).toBe("john smith");
    expect(normaliseName("SMITH, John").canonical).toBe("smith john");
    expect(normaliseName("Dr. Jane O'Connor").tokens).toEqual([
      "jane",
      "o",
      "connor",
    ]);
  });

  it("strips accents", () => {
    expect(normaliseName("José Núñez").canonical).toBe("jose nunez");
  });
});
