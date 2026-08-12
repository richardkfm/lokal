import { z } from "zod";
import { RATIONALE_SEVERITIES } from "./enums";

/**
 * Why the engine said what it said.
 *
 * A rationale item is never a sentence. It is a stable code, the parameters
 * needed to render it, and the intake fields that caused it. Renderers turn that
 * into German or English; the engine stays pure and the report can answer "why is
 * our helpdesk migration in phase 3?" using the reader's own answers.
 *
 * This is the difference between a plan someone can argue with and a black box.
 */

/** A pointer back to the input that triggered a finding. */
export const evidenceSchema = z.object({
  /** Dotted path into the assessment, e.g. `operating.linuxCapability`. */
  field: z.string().min(1),
  value: z.unknown(),
});

export const rationaleItemSchema = z.object({
  /**
   * Stable message key, e.g. `rationale.hosting.self_hosted_without_linux`.
   * Codes are part of the report's contract: renaming one is a breaking change
   * for stored assessments rendered against a newer rulepack.
   */
  code: z.string().min(1),
  severity: z.enum(RATIONALE_SEVERITIES),
  /** Values interpolated into the translated message. */
  params: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .default({}),
  evidence: z.array(evidenceSchema).default([]),
});

export type Evidence = z.infer<typeof evidenceSchema>;
export type RationaleItem = z.infer<typeof rationaleItemSchema>;

export type RationaleInput = {
  code: string;
  severity?: RationaleItem["severity"];
  params?: RationaleItem["params"];
  evidence?: Evidence[];
};

/** Builds a rationale item, defaulting to informational severity. */
export function rationale({
  code,
  severity = "info",
  params = {},
  evidence = [],
}: RationaleInput): RationaleItem {
  return { code, severity, params, evidence };
}

/** True when any item would block a recommendation outright. */
export function hasBlocker(items: readonly RationaleItem[]): boolean {
  return items.some((item) => item.severity === "blocker");
}

/**
 * Orders items so the reader meets the most consequential finding first.
 * Ties keep insertion order, which keeps engine output deterministic.
 */
const SEVERITY_RANK: Record<RationaleItem["severity"], number> = {
  blocker: 0,
  caution: 1,
  note: 2,
  info: 3,
};

export function bySeverity(items: readonly RationaleItem[]): RationaleItem[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort(
      (a, b) =>
        SEVERITY_RANK[a.item.severity] - SEVERITY_RANK[b.item.severity] ||
        a.index - b.index,
    )
    .map(({ item }) => item);
}
