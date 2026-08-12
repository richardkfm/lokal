import { describe, expect, it } from "vitest";
import de from "../../messages/de.json";
import en from "../../messages/en.json";
import { runEngine } from "@/engine";
import { buildReport } from "@/report/build-report";
import { toMarkdown } from "@/report/to-markdown";
import { currentRulepack } from "@/rulepack";
import { PERSONAS, persona } from "../fixtures/personas";
import type { PlanningReport } from "@/report/schema";

const pack = currentRulepack();
const GENERATED_AT = "2026-08-12T00:00:00.000Z";

type Catalog = Record<string, unknown>;
const CATALOGS: Record<string, Catalog> = { de, en };

/**
 * A deliberately strict stand-in for next-intl.
 *
 * It throws on a missing key and on an unresolved placeholder, rather than
 * silently emitting the raw key the way a lenient renderer would. That is
 * exactly the failure this catches: a report handed to management with
 * "rationale.next.verify_recommendations_against_current_releases" in the middle
 * of it, because a rationale item carried evidence but no params.
 */
function strictTranslator(locale: string) {
  const catalog = CATALOGS[locale]!;

  return (key: string, values?: Record<string, string | number | boolean>) => {
    const resolved = key
      .split(".")
      .reduce<unknown>((node, part) => (node as Catalog | undefined)?.[part], catalog);

    if (typeof resolved !== "string") {
      throw new Error(`Missing message: ${key}`);
    }

    return resolved.replace(/\{(\w+)\}/g, (_match, name: string) => {
      const value = values?.[name];
      if (value === undefined) {
        throw new Error(`Unresolved placeholder {${name}} in ${key}`);
      }
      return String(value);
    });
  };
}

function markdownFor(id: string, locale: "de" | "en" = "de"): string {
  const input = { ...persona(id).input, locale };
  const report: PlanningReport = buildReport(runEngine(input, pack), pack, {
    generatedAt: GENERATED_AT,
  });
  return toMarkdown(report, { t: strictTranslator(locale) });
}

describe("markdown export", () => {
  it.each(PERSONAS.map((p) => [p.id] as const))(
    "renders every message and placeholder for %s in German",
    (id) => {
      expect(() => markdownFor(id, "de")).not.toThrow();
    },
  );

  it.each(PERSONAS.map((p) => [p.id] as const))(
    "renders every message and placeholder for %s in English",
    (id) => {
      expect(() => markdownFor(id, "en")).not.toThrow();
    },
  );

  it("never leaks a raw message key into the output", () => {
    for (const { id } of PERSONAS) {
      const markdown = markdownFor(id);
      expect(markdown).not.toMatch(/\brationale\.[a-z_]+\./);
      expect(markdown).not.toMatch(/\breport\.[a-z]+\.[a-z]+/);
      expect(markdown).not.toMatch(/\{[a-zA-Z]+\}/);
    }
  });

  it("carries every section a stakeholder needs", () => {
    const markdown = markdownFor("municipality-180");

    for (const heading of [
      "# Migrationsplan",
      "## Auf einen Blick",
      "## 1. Zusammenfassung",
      "## 4. Empfohlener Zielaufbau",
      "## 5. Migrationsfahrplan",
      "## 6. Bereitschaft und Kapazität",
      "## 7. Lokale KI",
      "## 8. Tragfähigkeit und Ausblick",
      "## 9. Nächste Schritte",
      "## Methodik und Grenzen",
    ]) {
      expect(markdown).toContain(heading);
    }
  });

  it("shows what was ruled out and what to keep for now", () => {
    const school = markdownFor("school-45");
    expect(school).toMatch(/geprüft und ausgeschieden/);

    const sme = markdownFor("sme-900");
    expect(sme).toContain("Vorerst unverändert lassen");
  });

  it("states no currency amount", () => {
    for (const { id } of PERSONAS) {
      expect(markdownFor(id)).not.toMatch(/€|\bEUR\b/);
    }
  });

  it("is deterministic", () => {
    expect(markdownFor("municipality-180")).toBe(markdownFor("municipality-180"));
  });

  it("produces well-formed tables", () => {
    const markdown = markdownFor("municipality-180");
    const tableRows = markdown.split("\n").filter((line) => line.startsWith("|"));

    expect(tableRows.length).toBeGreaterThan(5);
    for (const row of tableRows) {
      expect(row.endsWith("|")).toBe(true);
    }
  });

  it("does not run headings together with body text", () => {
    const lines = markdownFor("municipality-180").split("\n");
    for (const [index, line] of lines.entries()) {
      if (line.startsWith("#")) {
        expect(lines[index + 1] ?? "").toBe("");
      }
    }
  });
});
