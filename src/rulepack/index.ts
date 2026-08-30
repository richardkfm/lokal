import { validateRulepack } from "./integrity";
import { rulepackV2026_08 } from "./v2026-08";
import { rulepackV2026_09 } from "./v2026-09";
import type { Rulepack } from "./schema";

export * from "./schema";
export * from "./integrity";

/**
 * The registry of released rulepacks.
 *
 * Assessments store the version they were taken against, so a report can say
 * whether the rules have moved since. Packs are immutable once released: a
 * correction ships as a new version rather than a silent edit. Otherwise a report
 * regenerated a month later could contradict the printed copy in someone's folder
 * with no way to tell why.
 *
 * Validation runs at module load, so a broken pack fails the build rather than a
 * user's report.
 */
const REGISTRY: Record<string, Rulepack> = {
  [rulepackV2026_08.version]: validateRulepack(rulepackV2026_08),
  [rulepackV2026_09.version]: validateRulepack(rulepackV2026_09),
};

/** The pack used for new assessments. */
export const CURRENT_RULEPACK_VERSION = rulepackV2026_09.version;

export function currentRulepack(): Rulepack {
  return getRulepack(CURRENT_RULEPACK_VERSION);
}

export function getRulepack(version: string): Rulepack {
  const pack = REGISTRY[version];
  if (!pack) {
    throw new Error(
      `Unknown rulepack version "${version}". Available: ${Object.keys(REGISTRY).join(", ")}.`,
    );
  }
  return pack;
}

/** Whether a stored assessment's rulepack is still available. */
export function hasRulepack(version: string): boolean {
  return version in REGISTRY;
}

export function availableRulepackVersions(): string[] {
  return Object.keys(REGISTRY).sort();
}
