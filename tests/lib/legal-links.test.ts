import { describe, expect, it } from "vitest";
import { legalLinks } from "@/lib/legal-links";

/**
 * Nothing invented, nothing implied.
 *
 * These three pages are the first thing a Datenschutzbeauftragte looks for, and
 * the one thing lokal must not fabricate: they are declarations about a specific
 * operator. So the contract is narrow — a link the operator supplied, or
 * nothing.
 */
describe("legalLinks", () => {
  it("is absent when nothing is configured", () => {
    expect(legalLinks({})).toBeNull();
  });

  it("reads the three links", () => {
    expect(
      legalLinks({
        LOKAL_LEGAL_IMPRINT_URL: "https://example.org/impressum",
        LOKAL_LEGAL_PRIVACY_URL: "https://example.org/datenschutz",
        LOKAL_LEGAL_ACCESSIBILITY_URL: "https://example.org/barrierefreiheit",
      }),
    ).toEqual({
      imprint: "https://example.org/impressum",
      privacy: "https://example.org/datenschutz",
      accessibility: "https://example.org/barrierefreiheit",
    });
  });

  it("shows the column for a single configured link", () => {
    expect(
      legalLinks({ LOKAL_LEGAL_PRIVACY_URL: "https://example.org/datenschutz" }),
    ).toEqual({
      imprint: undefined,
      privacy: "https://example.org/datenschutz",
      accessibility: undefined,
    });
  });

  it("drops a malformed link rather than throwing", () => {
    // A typo in one variable must never take down a page someone is printing.
    expect(
      legalLinks({
        LOKAL_LEGAL_IMPRINT_URL: "impressum",
        LOKAL_LEGAL_PRIVACY_URL: "https://example.org/datenschutz",
      }),
    ).toEqual({
      imprint: undefined,
      privacy: "https://example.org/datenschutz",
      accessibility: undefined,
    });
  });

  it("is absent when every configured link is malformed", () => {
    expect(legalLinks({ LOKAL_LEGAL_IMPRINT_URL: "not a url" })).toBeNull();
  });
});
