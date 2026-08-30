import { describe, expect, it } from "vitest";
import { runEngine } from "@/engine";
import { buildReport } from "@/report/build-report";
import { toMarkdown } from "@/report/to-markdown";
import { currentRulepack } from "@/rulepack";
import { PERSONAS, persona } from "../fixtures/personas";
import { strictTranslator } from "../fixtures/translator";
import type { PlanningReport } from "@/report/schema";

const pack = currentRulepack();
const GENERATED_AT = "2026-08-12T00:00:00.000Z";

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

  /**
   * Counts agree with their nouns.
   *
   * "1 Bereiche sollten vorerst unverändert bleiben" shipped in v0.1.0, in both
   * languages, because the test translator could not evaluate an ICU plural and
   * so the catalogue never used one. The translator is the real one now, which
   * is what makes this assertion possible at all.
   */
  it("agrees number and noun", () => {
    for (const { id } of PERSONAS) {
      expect(markdownFor(id, "de")).not.toMatch(/\b1 (Bereiche|Migrationen)\b/);
      expect(markdownFor(id, "en")).not.toMatch(/\b1 (areas|migrations)\b/);
    }
  });

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

  // ADR-0003 permits euro figures and forbids unaccountable ones. Where the
  // export names an amount it must also name the plan, the source and the date
  // it was read, so a reader can check it against their own invoice.
  it("never prints a euro figure without its basis", () => {
    for (const { id } of PERSONAS) {
      const markdown = markdownFor(id);
      if (!markdown.includes("€")) continue;

      expect(markdown).toContain("Rechengrundlage");
      expect(markdown).toMatch(/je Arbeitsplatz und Monat/);
      expect(markdown).toMatch(/Quelle: https:\/\//);
      // A date in the reader's convention, not the rulepack's ISO storage form.
      expect(markdown).toMatch(/erhoben am \d{1,2}\. \p{L}+ \d{4}/u);
      expect(markdown).not.toMatch(/erhoben am \d{4}-\d{2}-\d{2}/);
      // Coverage is stated wherever a sum is.
      expect(markdown).toMatch(/Belegt für \d+ von \d+ betrachteten Bereichen/);
    }
  });

  // The claims lokal must never make, whatever else changes about this section.
  it("makes no net-saving, ROI or payback claim", () => {
    for (const { id } of PERSONAS) {
      const markdown = markdownFor(id);
      expect(markdown).not.toMatch(/\bROI\b/i);
      expect(markdown).not.toMatch(/Amortisation|Kapitalrendite|payback/i);
      expect(markdown).not.toMatch(/\d+\s*% (?:Ersparnis|Einsparung|saving)/i);
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
