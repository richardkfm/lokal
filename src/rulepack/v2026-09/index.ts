import { aiDeployments, aiUseCases } from "../v2026-08/ai";
import { blockerRules } from "../v2026-08/blockers";
import { categories } from "../v2026-08/categories";
import { migrationEdges } from "../v2026-08/migration-edges";
import { prerequisites } from "../v2026-08/prerequisites";
import { sourceTools } from "../v2026-08/source-tools";
import { collaborationTargets } from "../v2026-08/targets/collaboration";
import { communicationTargets } from "../v2026-08/targets/communication";
import { recordsTargets } from "../v2026-08/targets/records";
import { workTargets } from "../v2026-08/targets/work";
import { euroOffice, euroOfficeCaution, euroOfficeEdges } from "./euro-office";
import { withListPrices } from "./prices";
import type { Rulepack } from "../schema";

/**
 * Rulepack v2026-09.
 *
 * A pack is immutable once released, so this is an overlay on v2026-08 rather
 * than an edit of it. A report regenerated next month must not quietly disagree
 * with the printed copy in someone's folder; v2026-08 stays registered and keeps
 * producing byte-identical output for every assessment taken against it.
 *
 * Two additions:
 *
 * 1. **Euro-Office**, which shipped 1.0 on 2026-06-09 — after v2026-08 was
 *    authored — together with its migration edges and a caution rule that keeps
 *    any young suite out of a large or business-critical rollout without a pilot.
 * 2. **Published list prices** on the source tools where a vendor's own page
 *    states one, which is what lets the report put a euro figure on current
 *    subscription exposure (ADR-0003).
 *
 * Everything else is v2026-08 unchanged. Entries remain `draft`: authored from
 * official documentation, not yet confirmed against a current release by a human.
 */
export const rulepackV2026_09: Rulepack = {
  version: "v2026-09",
  categories,
  sourceTools: withListPrices(sourceTools),
  targetTools: [
    ...collaborationTargets,
    euroOffice,
    ...communicationTargets,
    ...workTargets,
    ...recordsTargets,
  ],
  migrationEdges: [...migrationEdges, ...euroOfficeEdges],
  prerequisites,
  aiUseCases,
  aiDeployments,
  blockerRules: [...blockerRules, euroOfficeCaution],
};
