import { levelToUnit } from "@/domain/enums";
import { rationale, type RationaleItem } from "@/domain/rationale";
import { DIFFICULTY_WEIGHTS } from "./weights";
import type { MigrationEdge, Rulepack } from "@/rulepack/schema";
import type { CategoryRecommendation } from "./candidates";
import type { NormalizedAssessment } from "./normalize";
import type { ReadinessProfile } from "./readiness";

/**
 * Stage 4 — migration difficulty.
 *
 * How hard is this specific move, for this specific organization? The rulepack
 * supplies a base and a source-to-target adjustment; everything else comes from
 * the organization's own answers.
 */

export const DIFFICULTY_LABELS = ["low", "moderate", "high", "very_high"] as const;
export type DifficultyLabel = (typeof DIFFICULTY_LABELS)[number];

export type MigrationDifficulty = {
  /** 1–5, where 5 is a migration that needs its own project. */
  score: number;
  label: DifficultyLabel;
  drivers: RationaleItem[];
  edge: MigrationEdge | null;
  /** Warnings specific to this source-to-target move. */
  gotchas: string[];
};

/**
 * Seat pressure is stepped rather than linear. The jump happens when a migration
 * stops being something a small group can absorb and starts covering a whole
 * workforce — not with each additional user.
 */
export function seatPressure(seats: number): number {
  if (seats <= 25) return 0;
  if (seats <= 100) return 0.4;
  if (seats <= 500) return 0.8;
  if (seats <= 2000) return 1.2;
  return 1.6;
}

function labelFor(score: number): DifficultyLabel {
  if (score < 2) return "low";
  if (score < 3) return "moderate";
  if (score < 4) return "high";
  return "very_high";
}

/** Finds the most specific edge for a move: a named origin beats the wildcard. */
export function findEdge(
  pack: Rulepack,
  targetId: string,
  sourceId: string | null,
): MigrationEdge | null {
  const forTarget = pack.migrationEdges.filter((e) => e.to === targetId);
  return (
    (sourceId ? forTarget.find((e) => e.from === sourceId) : undefined) ??
    forTarget.find((e) => e.from === "*") ??
    null
  );
}

export function assessDifficulty(
  recommendation: CategoryRecommendation,
  assessment: NormalizedAssessment,
  readiness: ReadinessProfile,
  pack: Rulepack,
): MigrationDifficulty {
  const { entry, primary } = recommendation;

  if (!primary) {
    return {
      score: 5,
      label: "very_high",
      drivers: [
        rationale({
          code: "difficulty.no_viable_target",
          severity: "caution",
          evidence: [{ field: "stack.category", value: entry.category }],
        }),
      ],
      edge: null,
      gotchas: [],
    };
  }

  const sourceId = entry.currentTool.kind === "known" ? entry.currentTool.id : null;
  const edge = findEdge(pack, primary.tool.id, sourceId);

  const drivers: RationaleItem[] = [];
  const add = (code: string, field: string, value: unknown) =>
    drivers.push(rationale({ code, evidence: [{ field, value }] }));

  let score = primary.tool.migrationComplexityBase;
  add(
    "difficulty.base_complexity",
    "target.migrationComplexityBase",
    primary.tool.migrationComplexityBase,
  );

  if (edge) {
    score += edge.complexityDelta;
    if (edge.complexityDelta > 0) {
      add(
        "difficulty.origin_makes_it_harder",
        "migrationEdge",
        `${edge.from}->${edge.to}`,
      );
    } else if (edge.complexityDelta < 0) {
      add(
        "difficulty.origin_makes_it_easier",
        "migrationEdge",
        `${edge.from}->${edge.to}`,
      );
    }
  } else if (entry.currentTool.kind === "other") {
    // An unrecognized incumbent means nobody has mapped this path before.
    score += 0.5;
    add(
      "difficulty.unknown_current_tool",
      "stack.currentTool",
      entry.currentTool.label,
    );
  }

  const pressure = seatPressure(entry.seats);
  if (pressure > 0) {
    score += pressure;
    add("difficulty.seat_count", "stack.seats", entry.seats);
  }

  if (entry.criticality === "high") {
    score += DIFFICULTY_WEIGHTS.criticality;
    add("difficulty.business_critical", "stack.criticality", entry.criticality);
  }

  // A migration that needs accounts and groups is harder when there is no
  // central directory to attach to.
  const needsIdentity = primary.tool.prerequisites.includes("identity-directory");
  if (needsIdentity && assessment.input.operating.identityMaturity === "low") {
    score += DIFFICULTY_WEIGHTS.identityGap;
    add("difficulty.identity_gap", "operating.identityMaturity", "low");
  }

  const trainingFactor =
    levelToUnit(entry.trainingSensitivity) * ((primary.tool.trainingLoad - 1) / 4);
  if (trainingFactor > 0.4) {
    score += DIFFICULTY_WEIGHTS.trainingSensitivity;
    add(
      "difficulty.training_sensitivity",
      "stack.trainingSensitivity",
      entry.trainingSensitivity,
    );
  }

  const relief =
    DIFFICULTY_WEIGHTS.opsCapabilityRelief * (readiness.opsCapability.score / 100);
  if (relief > 0.3) {
    score -= relief;
    add(
      "difficulty.capable_team_reduces_effort",
      "readiness.opsCapability",
      readiness.opsCapability.label,
    );
  }

  const clamped = Math.min(Math.max(score, 1), 5);

  return {
    score: Math.round(clamped * 10) / 10,
    label: labelFor(clamped),
    drivers,
    edge,
    gotchas: edge?.gotchas ?? [],
  };
}
