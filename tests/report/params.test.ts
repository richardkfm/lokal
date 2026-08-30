import { describe, expect, it } from "vitest";
import de from "../../messages/de.json";
import {
  AI_DEPLOYMENTS,
  AI_INTERESTS,
  AI_TIMINGS,
  AI_USE_CASE_IDS,
  CATEGORY_IDS,
  HARDWARE_PROFILES,
  HOSTING_MODES,
  HOSTING_PREFERENCES,
  LEVELS,
  LINUX_CAPABILITIES,
  ORG_TYPES,
  OUTLOOK_BANDS,
  READINESS_LABELS,
  SUPPORT_EXPECTATIONS,
  SUPPORT_MODELS,
  URGENCIES,
} from "@/domain/enums";
import { DIFFICULTY_LABELS } from "@/engine/difficulty";
import { runEngine } from "@/engine";
import { buildReport } from "@/report/build-report";
import { localizeParams } from "@/report/params";
import { toMarkdown } from "@/report/to-markdown";
import { currentRulepack } from "@/rulepack";
import { PERSONAS, persona } from "../fixtures/personas";

/**
 * Raw enum values must never reach a reader.
 *
 * The engine speaks in codes by design, and every one of them passes through a
 * renderer that is supposed to resolve it. When one does not, the result is not
 * a crash or a missing string — it is a plausible-looking German sentence with
 * "Hoher Aufwand (very_high)" in the middle of it, going to a council meeting.
 * Nothing about that fails a type check, a lint rule or a missing-key test,
 * which is why it survived to a shipped release.
 *
 * So this walks the whole rendered document for every persona and fails on any
 * enum value that appears as a bare word. It is deliberately checked against
 * German only: several enum values ("high", "none", "strong") are ordinary
 * English words that belong in English prose, whereas German prose containing
 * the token "high" is always a leak.
 */

const pack = currentRulepack();

const ENUM_VALUES = new Set<string>([
  ...AI_DEPLOYMENTS,
  ...AI_INTERESTS,
  ...AI_TIMINGS,
  ...AI_USE_CASE_IDS,
  ...CATEGORY_IDS,
  ...DIFFICULTY_LABELS,
  ...HARDWARE_PROFILES,
  ...HOSTING_MODES,
  ...HOSTING_PREFERENCES,
  ...LEVELS,
  ...LINUX_CAPABILITIES,
  ...ORG_TYPES,
  ...OUTLOOK_BANDS,
  ...READINESS_LABELS,
  ...SUPPORT_EXPECTATIONS,
  ...SUPPORT_MODELS,
  ...URGENCIES,
]);

/** The strict translator from `to-markdown.test.ts`, minus the placeholder check. */
function translate(key: string, values?: Record<string, string | number | boolean>) {
  const resolved = key
    .split(".")
    .reduce<unknown>(
      (node, part) => (node as Record<string, unknown> | undefined)?.[part],
      de as Record<string, unknown>,
    );

  if (typeof resolved !== "string") throw new Error(`Missing message: ${key}`);

  return resolved.replace(/\{(\w+)\}/g, (_match, name: string) =>
    String(values?.[name] ?? `{${name}}`),
  );
}

/**
 * Prose only.
 *
 * Links, source citations and the rulepack version legitimately contain tokens
 * that look like enum values; they are machine identifiers on purpose and are
 * not what this is looking for.
 */
function prose(markdown: string): string {
  return markdown
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/`[^`]*`/g, " ");
}

function markdownFor(id: string): string {
  const input = { ...persona(id).input, locale: "de" as const };
  const report = buildReport(runEngine(input, pack), pack, {
    generatedAt: "2026-08-12T00:00:00.000Z",
  });
  return toMarkdown(report, { t: translate });
}

describe("enum values in rendered output", () => {
  it.each(PERSONAS.map((p) => [p.id] as const))(
    "leaves none in the German report for %s",
    (id) => {
      const words = prose(markdownFor(id)).match(/\b[a-z][a-z_]*[a-z]\b/g) ?? [];
      const leaked = [...new Set(words.filter((word) => ENUM_VALUES.has(word)))];

      expect(leaked).toEqual([]);
    },
  );
});

describe("localizeParams", () => {
  it("resolves every parameter that carries an enum", () => {
    const params = {
      category: "office_docs",
      dependsOn: "file_sharing",
      difficulty: "very_high",
      readiness: "developing",
      sensitivity: "high",
      required: "gpu_capable",
      available: "office_pcs",
      useCase: "summarization",
      orgType: "municipality",
    };

    expect(localizeParams(params, translate)).toEqual({
      category: "Office und Dokumente",
      dependsOn: "Dateiablage",
      difficulty: "sehr hoch",
      readiness: "Im Aufbau",
      sensitivity: "Hoch",
      required: "Server mit Grafikkarte",
      available: "Arbeitsplatzrechner",
      useCase: "Zusammenfassungen",
      orgType: "Kommune",
    });
  });

  it("leaves a value that is not one of that parameter's enum values alone", () => {
    // `tool` is free text from the rulepack, and a product could be named
    // anything at all — including something that collides with an enum value.
    const params = { tool: "office_docs", category: "not_a_category" };

    expect(localizeParams(params, translate)).toEqual(params);
  });

  it("returns the same object when there is nothing to resolve", () => {
    const params = { seats: 180, tool: "Nextcloud" };

    expect(localizeParams(params, translate)).toBe(params);
  });
});
