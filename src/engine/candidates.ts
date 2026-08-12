import { levelToUnit, type CategoryId, type Score5 } from "@/domain/enums";
import { rationale, type RationaleItem } from "@/domain/rationale";
import {
  ECOSYSTEM_COHERENCE_BONUS,
  FIT_WEIGHTS,
  PENALTY_WEIGHTS,
  PUBLIC_SECTOR_FIT_WEIGHT,
} from "./weights";
import type { StackEntry } from "@/domain/intake";
import type { Rulepack, TargetTool } from "@/rulepack/schema";
import type { NormalizedAssessment } from "./normalize";
import type { ReadinessProfile } from "./readiness";

/**
 * Stages 2 and 3 — candidate filtering and fit scoring.
 *
 * Hard constraints eliminate candidates before anything is scored, and the
 * reasons are **kept**. A report that says "considered and ruled out, because
 * community support only and you told us you need a vendor contract" is doing
 * something a ranked list cannot, and it costs almost nothing to retain.
 */

export type ScoredCandidate = {
  tool: TargetTool;
  /** 0–100 fit for this organization and this category. */
  score: number;
  fitReasons: RationaleItem[];
  cautions: RationaleItem[];
};

export type EliminatedCandidate = {
  tool: TargetTool;
  reason: RationaleItem;
};

export type CategoryRecommendation = {
  category: CategoryId;
  entry: StackEntry;
  primary: ScoredCandidate | null;
  backups: ScoredCandidate[];
  /** Candidates ruled out, with the rule that ruled each one out. */
  eliminated: EliminatedCandidate[];
  notes: RationaleItem[];
};

/** Maps a 1–5 rating onto 0..1. */
function unit(score: Score5): number {
  return (score - 1) / 4;
}

const SUPPORT_MODEL_UNIT = {
  community: 0,
  commercial_available: 0.6,
  vendor_backed: 1,
} as const;

/** How well a candidate's hosting options match what the organization wants. */
function hostingMatch(
  tool: TargetTool,
  preference: NormalizedAssessment["input"]["operating"]["hostingPreference"],
): number {
  if (preference === "self_hosted") {
    return tool.hostingModes.includes("self_hosted") ||
      tool.hostingModes.includes("local_device")
      ? 1
      : 0;
  }
  if (preference === "eu_hosted") {
    if (tool.hostingModes.includes("eu_managed")) return 1;
    if (tool.hostingModes.includes("eu_saas")) return 0.8;
    // Self-hosting is not what they asked for, but it does keep data in-house.
    return tool.hostingModes.includes("self_hosted") ? 0.5 : 0;
  }
  // Undecided: more options is genuinely better, since nothing is foreclosed.
  return Math.min(tool.hostingModes.length / 2, 1);
}

function scoreCandidate(
  tool: TargetTool,
  assessment: NormalizedAssessment,
  readiness: ReadinessProfile,
  entry: StackEntry,
): ScoredCandidate {
  const { input, derived } = assessment;

  const base =
    FIT_WEIGHTS.sovereignty * unit(tool.sovereignty) +
    FIT_WEIGHTS.maturity * unit(tool.maturity) +
    FIT_WEIGHTS.deMarketPresence * unit(tool.deMarketPresence) +
    FIT_WEIGHTS.germanUiQuality * unit(tool.germanUiQuality) +
    FIT_WEIGHTS.hostingModeMatch *
      hostingMatch(tool, input.operating.hostingPreference) +
    FIT_WEIGHTS.supportModel * SUPPORT_MODEL_UNIT[tool.supportModel];

  const publicSectorComponent = derived.publicSectorProfile
    ? PUBLIC_SECTOR_FIT_WEIGHT * unit(tool.publicSectorFit)
    : 0;

  const total = derived.publicSectorProfile
    ? (base + publicSectorComponent) / (1 + PUBLIC_SECTOR_FIT_WEIGHT)
    : base;

  // Penalties reflect what this organization can absorb, not the product alone.
  const opsPenalty =
    PENALTY_WEIGHTS.opsLoad *
    unit(tool.selfHostOpsLoad) *
    (1 - readiness.opsCapability.score / 100);

  const trainingPenalty =
    PENALTY_WEIGHTS.trainingLoad *
    unit(tool.trainingLoad) *
    levelToUnit(entry.trainingSensitivity) *
    (0.5 + 0.5 * derived.seatWeight);

  const score = Math.round(
    Math.min(Math.max(100 * (total - opsPenalty - trainingPenalty), 0), 100),
  );

  // Fit reasons name the properties that actually carried this candidate, so the
  // report explains a recommendation rather than asserting it.
  const fitReasons: RationaleItem[] = [];
  const note = (code: string, field: string, value: unknown) =>
    fitReasons.push(rationale({ code, evidence: [{ field, value }] }));

  if (tool.sovereignty >= 4)
    note("fit.strong_sovereignty", "sovereignty", tool.sovereignty);
  if (tool.deMarketPresence >= 4) {
    note("fit.german_service_market", "deMarketPresence", tool.deMarketPresence);
  }
  if (tool.germanUiQuality >= 4) {
    note("fit.german_interface", "germanUiQuality", tool.germanUiQuality);
  }
  if (derived.publicSectorProfile && tool.publicSectorFit >= 4) {
    note("fit.public_sector_references", "publicSectorFit", tool.publicSectorFit);
  }
  if (tool.supportModel === "vendor_backed") {
    note("fit.vendor_backed_support", "supportModel", tool.supportModel);
  }
  if (tool.selfHostOpsLoad <= 2) {
    note("fit.low_operating_effort", "selfHostOpsLoad", tool.selfHostOpsLoad);
  }
  if (tool.trainingLoad <= 2)
    note("fit.low_training_effort", "trainingLoad", tool.trainingLoad);
  if (tool.coexistence === "good") {
    note("fit.can_run_alongside_current", "coexistence", tool.coexistence);
  }

  return { tool, score, fitReasons, cautions: [] };
}

/**
 * Applies the rulepack's blocker rules, splitting candidates into those that
 * survive (carrying any cautions) and those that are ruled out.
 */
function applyRules(
  pack: Rulepack,
  assessment: NormalizedAssessment,
  entry: StackEntry,
  tool: TargetTool,
): { eliminated: RationaleItem | null; cautions: RationaleItem[] } {
  const cautions: RationaleItem[] = [];
  let eliminated: RationaleItem | null = null;

  for (const rule of pack.blockerRules) {
    if (!rule.when({ input: assessment.input, entry, target: tool })) continue;

    const item = rationale({
      code: rule.message,
      severity: rule.severity,
      params: { tool: tool.name },
      evidence: [{ field: "rulepack.blockerRules", value: rule.id }],
    });

    if (rule.severity === "blocker") {
      // First blocker wins. Rules are ordered most-fundamental-first, so the
      // reason shown is the one a reader would consider decisive.
      eliminated ??= item;
    } else {
      cautions.push(item);
    }
  }

  return { eliminated, cautions };
}

/**
 * Selects a target stack.
 *
 * Runs in two passes so that ecosystem coherence can be applied: the first pass
 * scores every category independently, the second re-ranks with a bounded bonus
 * for products belonging to an ecosystem already chosen. The bonus is small by
 * design — coherence is worth one identity integration and one backup routine,
 * not overriding a genuine mismatch.
 */
export function selectStack(
  assessment: NormalizedAssessment,
  readiness: ReadinessProfile,
  pack: Rulepack,
): CategoryRecommendation[] {
  const firstPass = assessment.input.stack.map((entry) => {
    const candidates = pack.targetTools.filter((t) => t.category === entry.category);

    const eliminated: EliminatedCandidate[] = [];
    const surviving: ScoredCandidate[] = [];

    for (const tool of candidates) {
      const { eliminated: blocked, cautions } = applyRules(
        pack,
        assessment,
        entry,
        tool,
      );

      if (blocked) {
        eliminated.push({ tool, reason: blocked });
        continue;
      }

      const scored = scoreCandidate(tool, assessment, readiness, entry);
      surviving.push({ ...scored, cautions });
    }

    return { entry, surviving, eliminated };
  });

  // Which ecosystems the clear winners belong to, used to break ties elsewhere.
  const preferredEcosystems = new Set(
    firstPass
      .map(({ surviving }) => [...surviving].sort((a, b) => b.score - a.score)[0])
      .filter((best): best is ScoredCandidate => Boolean(best?.tool.ecosystem))
      .map((best) => best.tool.ecosystem as string),
  );

  return firstPass.map(({ entry, surviving, eliminated }) => {
    const ranked = surviving
      .map((candidate) => {
        if (
          !candidate.tool.ecosystem ||
          !preferredEcosystems.has(candidate.tool.ecosystem)
        ) {
          return candidate;
        }
        return {
          ...candidate,
          score: Math.min(candidate.score + ECOSYSTEM_COHERENCE_BONUS, 100),
          fitReasons: [
            ...candidate.fitReasons,
            rationale({
              code: "fit.fits_chosen_ecosystem",
              params: { ecosystem: candidate.tool.ecosystem },
              evidence: [{ field: "ecosystem", value: candidate.tool.ecosystem }],
            }),
          ],
        };
      })
      // Ties break by rulepack order, keeping output deterministic.
      .sort((a, b) => b.score - a.score);

    const notes: RationaleItem[] = [];
    if (ranked.length === 0) {
      notes.push(
        rationale({
          code: "note.no_candidate_survived_constraints",
          severity: "caution",
          params: { category: entry.category, considered: eliminated.length },
          evidence: [{ field: "stack.category", value: entry.category }],
        }),
      );
    }

    return {
      category: entry.category,
      entry,
      primary: ranked[0] ?? null,
      backups: ranked.slice(1, 3),
      eliminated,
      notes,
    };
  });
}
