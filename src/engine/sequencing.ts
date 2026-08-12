import { levelToUnit, type CategoryId, type PhaseId } from "@/domain/enums";
import { rationale, type RationaleItem } from "@/domain/rationale";
import { SEQUENCING_WEIGHTS } from "./weights";
import type { Prerequisite, Rulepack } from "@/rulepack/schema";
import type { CategoryRecommendation } from "./candidates";
import type { MigrationDifficulty } from "./difficulty";
import type { NormalizedAssessment } from "./normalize";
import type { ReadinessProfile } from "./readiness";

/**
 * Stage 5 — sequencing.
 *
 * Turns a set of independent recommendations into an ordered plan. This is where
 * lokal stops being a comparison and starts being a plan: what first, what can
 * wait, and what should not be attempted yet at all.
 */

export type PlannedMigration = {
  category: CategoryId;
  recommendation: CategoryRecommendation;
  difficulty: MigrationDifficulty;
  seats: number;
  value: number;
  cost: number;
  phase: PhaseId;
  reasons: RationaleItem[];
};

/**
 * A category the organization should keep for now, with the condition that
 * should prompt a fresh look. This is a first-class output, not a gap: "what can
 * stay" is one of the questions people most need answered.
 */
export type DeferredMigration = {
  category: CategoryId;
  recommendation: CategoryRecommendation;
  reason: RationaleItem;
  revisitWhen: string;
};

export type Phase = {
  id: PhaseId;
  migrations: PlannedMigration[];
  prerequisites: Prerequisite[];
  affectedSeats: number;
  notes: RationaleItem[];
};

export type Sequencing = {
  phases: Phase[];
  keepForNow: DeferredMigration[];
};

const URGENCY_UNIT = { now: 1, this_year: 0.6, later: 0.2 } as const;

/** How many high-criticality migrations an organization can run at once. */
function concurrentCriticalLimit(readiness: ReadinessProfile): number {
  switch (readiness.changeCapacity.label) {
    case "weak":
      return 1;
    case "developing":
      return 1;
    case "solid":
      return 2;
    case "strong":
      return 3;
  }
}

export function sequence(
  recommendations: CategoryRecommendation[],
  difficulties: Map<CategoryId, MigrationDifficulty>,
  assessment: NormalizedAssessment,
  readiness: ReadinessProfile,
  pack: Rulepack,
): Sequencing {
  const keepForNow: DeferredMigration[] = [];
  const candidates: PlannedMigration[] = [];

  for (const recommendation of recommendations) {
    const { entry } = recommendation;
    const difficulty = difficulties.get(entry.category);
    if (!difficulty) continue;

    // --- "Keep for now" -----------------------------------------------------
    // Nothing viable, or the effort plainly outweighs what the organization
    // stands to gain right now. Saying so is more useful than scheduling a
    // migration nobody will carry out.
    if (!recommendation.primary) {
      keepForNow.push({
        category: entry.category,
        recommendation,
        reason: rationale({
          code: "keep.no_suitable_target_yet",
          severity: "note",
          params: { category: entry.category },
          evidence: [{ field: "stack.category", value: entry.category }],
        }),
        revisitWhen: "revisit.when_constraints_change",
      });
      continue;
    }

    const value =
      SEQUENCING_WEIGHTS.pain * levelToUnit(entry.pain) +
      SEQUENCING_WEIGHTS.urgency * URGENCY_UNIT[entry.urgency] +
      SEQUENCING_WEIGHTS.lockInConcern * levelToUnit(entry.lockInConcern);

    const cost =
      SEQUENCING_WEIGHTS.difficulty * ((difficulty.score - 1) / 4) +
      SEQUENCING_WEIGHTS.criticality * levelToUnit(entry.criticality);

    if (entry.pain === "low" && entry.urgency === "later" && difficulty.score >= 3) {
      keepForNow.push({
        category: entry.category,
        recommendation,
        reason: rationale({
          code: "keep.effort_outweighs_current_benefit",
          severity: "note",
          params: { category: entry.category, difficulty: difficulty.label },
          evidence: [
            { field: "stack.pain", value: entry.pain },
            { field: "stack.urgency", value: entry.urgency },
          ],
        }),
        revisitWhen: "revisit.at_contract_renewal",
      });
      continue;
    }

    candidates.push({
      category: entry.category,
      recommendation,
      difficulty,
      seats: entry.seats,
      value,
      cost,
      phase: 1,
      reasons: [],
    });
  }

  // --- Assign phases --------------------------------------------------------
  // High value against low cost goes early; high cost or high criticality goes
  // late. Sorting by net benefit first keeps the ordering stable and explicable.
  const ordered = [...candidates].sort(
    (a, b) =>
      b.value - b.cost - (a.value - a.cost) || a.category.localeCompare(b.category),
  );

  const criticalLimit = concurrentCriticalLimit(readiness);
  const criticalPerPhase = new Map<PhaseId, number>();

  for (const migration of ordered) {
    const { entry } = migration.recommendation;
    const isCritical = entry.criticality === "high";

    let phase: PhaseId;
    if (
      migration.difficulty.score >= 4 ||
      migration.recommendation.primary!.tool.coexistence === "poor"
    ) {
      phase = 3;
      migration.reasons.push(
        rationale({
          code: "phase.complex_or_cannot_run_in_parallel",
          params: { difficulty: migration.difficulty.label },
          evidence: [{ field: "difficulty", value: migration.difficulty.score }],
        }),
      );
    } else if (migration.difficulty.score >= 2.6 || isCritical) {
      phase = 2;
      migration.reasons.push(
        rationale({
          code: "phase.moderate_effort_or_business_critical",
          evidence: [{ field: "stack.criticality", value: entry.criticality }],
        }),
      );
    } else {
      phase = 1;
      migration.reasons.push(
        rationale({
          code: "phase.quick_win",
          evidence: [{ field: "difficulty", value: migration.difficulty.score }],
        }),
      );
    }

    // Spread business-critical work: an organization that cannot absorb two
    // disruptive changes at once should not be handed a plan that requires it.
    if (isCritical) {
      while (phase < 3 && (criticalPerPhase.get(phase) ?? 0) >= criticalLimit) {
        phase = (phase + 1) as PhaseId;
        migration.reasons.push(
          rationale({
            code: "phase.deferred_to_spread_critical_change",
            severity: "note",
            params: { limit: criticalLimit },
            evidence: [
              {
                field: "readiness.changeCapacity",
                value: readiness.changeCapacity.label,
              },
            ],
          }),
        );
      }
      criticalPerPhase.set(phase, (criticalPerPhase.get(phase) ?? 0) + 1);
    }

    migration.phase = phase;
  }

  // --- Enforce inter-migration dependencies ---------------------------------
  // Some prerequisites are satisfied by migrating another category: chat that
  // runs on a file platform cannot go live before that platform does. Without
  // this pass a plan can be internally consistent on paper and impossible in
  // practice, which is precisely the kind of error a planning tool exists to
  // prevent.
  const providerPhase = new Map<string, PhaseId>();
  for (const migration of ordered) {
    const category = pack.categories.find((c) => c.id === migration.category);
    for (const provided of category?.provides ?? []) {
      providerPhase.set(provided, migration.phase);
    }
  }

  // Repeat until stable: moving one migration can push another that depends on
  // it. Bounded by the number of migrations, so it always terminates.
  for (let pass = 0; pass < ordered.length + 1; pass += 1) {
    let moved = false;

    for (const migration of ordered) {
      for (const required of migration.recommendation.primary!.tool.prerequisites) {
        const suppliedIn = providerPhase.get(required);
        if (suppliedIn === undefined) continue;

        const supplier = ordered.find((candidate) =>
          (
            pack.categories.find((c) => c.id === candidate.category)?.provides ?? []
          ).includes(required),
        );
        if (!supplier || supplier === migration) continue;

        if (migration.phase <= supplier.phase && supplier.phase < 4) {
          migration.phase = Math.min(supplier.phase + 1, 4) as PhaseId;
          migration.reasons.push(
            rationale({
              code: "phase.waits_for_dependency",
              severity: "note",
              params: { dependsOn: supplier.category },
              evidence: [{ field: "target.prerequisites", value: required }],
            }),
          );
          moved = true;
        }
      }
    }

    // Refresh provider phases after any move, then stop once nothing shifts.
    if (!moved) break;
    for (const migration of ordered) {
      const category = pack.categories.find((c) => c.id === migration.category);
      for (const provided of category?.provides ?? []) {
        providerPhase.set(provided, migration.phase);
      }
    }
  }

  // --- Phase 0: prerequisites ----------------------------------------------
  // Gathered from everything scheduled later, which is why phase 0 is never
  // empty in a real plan.
  const neededPrerequisiteIds = new Set(
    ordered.flatMap((m) => m.recommendation.primary?.tool.prerequisites ?? []),
  );
  const phaseZeroPrerequisites = pack.prerequisites.filter((p) =>
    neededPrerequisiteIds.has(p.id),
  );

  const phases: Phase[] = ([0, 1, 2, 3, 4] as const).map((id) => {
    const migrations = ordered.filter((m) => m.phase === id);
    const notes: RationaleItem[] = [];

    if (id === 0 && phaseZeroPrerequisites.length > 0) {
      notes.push(
        rationale({
          code: "phase.prerequisites_before_anything_else",
          params: { count: phaseZeroPrerequisites.length },
          evidence: [
            { field: "prerequisites", value: phaseZeroPrerequisites.map((p) => p.id) },
          ],
        }),
      );
    }

    if (id === 4) {
      notes.push(
        rationale({
          code: "phase.optimization_and_local_ai",
          evidence: [{ field: "ai.interest", value: assessment.input.ai.interest }],
        }),
      );
    }

    return {
      id,
      migrations,
      prerequisites: id === 0 ? phaseZeroPrerequisites : [],
      affectedSeats: migrations.reduce((sum, m) => sum + m.seats, 0),
      notes,
    };
  });

  return { phases, keepForNow };
}
