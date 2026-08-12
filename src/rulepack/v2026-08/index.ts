import { aiDeployments, aiUseCases } from "./ai";
import { blockerRules } from "./blockers";
import { categories } from "./categories";
import { migrationEdges } from "./migration-edges";
import { prerequisites } from "./prerequisites";
import { sourceTools } from "./source-tools";
import { collaborationTargets } from "./targets/collaboration";
import { communicationTargets } from "./targets/communication";
import { recordsTargets } from "./targets/records";
import { workTargets } from "./targets/work";
import type { Rulepack } from "../schema";

/**
 * Rulepack v2026-08.
 *
 * Every entry is `draft`: ratings were authored from general knowledge against
 * official documentation, and none has yet been confirmed against a current
 * release by a human reviewer. The report states this so nobody mistakes a
 * plausible rating for a researched one.
 */
export const rulepackV2026_08: Rulepack = {
  version: "v2026-08",
  categories,
  sourceTools,
  targetTools: [
    ...collaborationTargets,
    ...communicationTargets,
    ...workTargets,
    ...recordsTargets,
  ],
  migrationEdges,
  prerequisites,
  aiUseCases,
  aiDeployments,
  blockerRules,
};
