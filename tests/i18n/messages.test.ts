import { describe, expect, it } from "vitest";
import de from "../../messages/de.json";
import en from "../../messages/en.json";
import { routing } from "@/i18n/routing";

type Messages = Record<string, unknown>;

/** Flattens a nested message catalog into dotted key paths. */
function keyPaths(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return [prefix];
  }
  return Object.entries(value as Messages).flatMap(([key, child]) =>
    keyPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

const catalogs: Record<string, Messages> = { de, en };

describe("message catalogs", () => {
  it("provides a catalog for every configured locale", () => {
    for (const locale of routing.locales) {
      expect(Object.keys(catalogs)).toContain(locale);
    }
  });

  // German is the source language. English is allowed to lag in wording quality
  // until v0.2.0, but never in coverage — a missing key renders as a raw key path
  // in the middle of a report someone is about to forward to their management.
  it("keeps every locale in structural sync with German", () => {
    const source = keyPaths(de).sort();

    for (const [locale, catalog] of Object.entries(catalogs)) {
      const actual = keyPaths(catalog).sort();
      expect({ locale, missing: source.filter((k) => !actual.includes(k)) }).toEqual({
        locale,
        missing: [],
      });
      expect({ locale, extra: actual.filter((k) => !source.includes(k)) }).toEqual({
        locale,
        extra: [],
      });
    }
  });

  it("has no empty message values", () => {
    for (const [locale, catalog] of Object.entries(catalogs)) {
      const empty = keyPaths(catalog).filter((path) => {
        const value = path
          .split(".")
          .reduce<unknown>(
            (node, key) => (node as Messages | undefined)?.[key],
            catalog,
          );
        return typeof value !== "string" || value.trim() === "";
      });
      expect({ locale, empty }).toEqual({ locale, empty: [] });
    }
  });
});
