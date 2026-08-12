import type { TargetTool } from "../../schema";

/**
 * Every target entry is authored as `draft` for v0.1.0: ratings come from general
 * knowledge and cite official documentation a reviewer can follow, but none has
 * yet been confirmed against the current release by a human. The report says so.
 *
 * Rating guidance, so the numbers mean the same thing across entries:
 *
 * - `sovereignty` — can you genuinely run and leave this on your own terms?
 *   5 requires self-hosting plus an open format story.
 * - `maturity` — release cadence, install base, longevity. Not popularity.
 * - `deMarketPresence` — can a German organization actually buy help for this?
 * - `germanUiQuality` — German UI, docs and support language.
 * - `publicSectorFit` — track record in German public bodies specifically.
 * - `selfHostOpsLoad` — ongoing admin burden once running, not install effort.
 * - `trainingLoad` — how much retraining ordinary staff need, not admins.
 * - `comfortableUpTo` — seats beyond which a single standard install typically
 *   needs deliberate scaling work. A planning signal, not a hard limit.
 *
 * When unsure, rate conservatively. An understated recommendation costs a little
 * credibility; an overstated one costs all of it.
 */
export function target(
  entry: Omit<TargetTool, "lastReviewed" | "reviewStatus">,
): TargetTool {
  return { ...entry, lastReviewed: "2026-08-12", reviewStatus: "draft" };
}
