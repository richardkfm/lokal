import { rulepackV2026_09 } from "../v2026-09";
import { clientOsLane, clientOsPrerequisites } from "./client-os";
import type { Rulepack } from "../schema";

/**
 * Rulepack v2026-10.
 *
 * An overlay on v2026-09, which is itself an overlay on v2026-08. A pack is
 * immutable once released: a report regenerated next month must not quietly
 * disagree with the printed copy in someone's folder, so both earlier versions
 * stay registered and keep producing byte-identical output for the assessments
 * taken against them.
 *
 * One addition: **the client operating system as a planning lane**. The nine
 * categories are all applications, and until now nothing in lokal had anything
 * to say about the machines they run on — which, for the Microsoft-shop SME and
 * Kommune this tool is aimed at, is the largest single piece of lock-in in the
 * building.
 *
 * The lane is rules, not products. It answers whether the desktop can move, when,
 * and what blocks it; it never names a distribution. That deferral is recorded in
 * plans/roadmap.md and is what lets the lane ship without the product research a
 * tenth category would need — and it is also the honest boundary, because a
 * distribution recommendation derived from five intake answers would be exactly
 * the alternatives-finder output lokal exists not to produce.
 *
 * Two prerequisites come with it. `endpoint-management` is *not* among them: it
 * already exists in v2026-08 and is the same piece of work whether it is
 * carrying LibreOffice or a whole operating system.
 *
 * Everything else is v2026-09 unchanged, prices and Euro-Office included.
 */
export const rulepackV2026_10: Rulepack = {
  ...rulepackV2026_09,
  version: "v2026-10",
  prerequisites: [...rulepackV2026_09.prerequisites, ...clientOsPrerequisites],
  clientOsLane,
};
