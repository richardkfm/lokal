import { WORK_PACKAGES, levelToUnit, type WorkPackage } from "@/domain/enums";
import { rationale, type RationaleItem } from "@/domain/rationale";
import type { MigrationEdge } from "@/rulepack/schema";
import type { StackEntry } from "@/domain/intake";
import type { MigrationDifficulty } from "./difficulty";

/**
 * Work packages — what a range of days is actually made of.
 *
 * A migration that costs "18–35 Tage" is a number the reader has to take on
 * trust. The same migration broken into preparation, data migration, a pilot,
 * the rollout, training, parallel running and aftercare is a number they can
 * argue with, and arguing with it is the point: the reader knows their own
 * organization better than any rulepack does.
 *
 * **This module explains the band. It must never change it.** The weights below
 * are normalised and the rounded packages are reconciled so that they sum
 * exactly to the band's `min` and `max`. If the total moved, this would stop
 * being an explanation and become a scoring change wearing one — and a scoring
 * change disguised as a rendering improvement is how a planning tool starts
 * disagreeing with the printed copy in someone's folder.
 */

export type EffortItem = {
  package: WorkPackage;
  days: { min: number; max: number };
  /** Why this package is here at all, and what drove its size. */
  reasons: RationaleItem[];
};

/**
 * Relative weight per package, before normalisation.
 *
 * These are proportions of one migration's effort, not day counts. A package
 * whose weight comes out at zero is not emitted at all: a plan with no training
 * load should show no training line, rather than a line reading zero days.
 */
type Weighted = { package: WorkPackage; weight: number; reasons: RationaleItem[] };

/** Seats, expressed as the share of the workforce being carried through. */
function seatShare(seats: number, totalSeats: number): number {
  if (totalSeats <= 0) return 0;
  return Math.min(seats / totalSeats, 1);
}

export type EffortInputs = {
  entry: StackEntry;
  difficulty: MigrationDifficulty;
  edge: MigrationEdge | null;
  seats: number;
  totalSeats: number;
  pilotRecommended: boolean;
  coexistence: string;
  trainingLoad: number;
};

function weightsFor(inputs: EffortInputs): Weighted[] {
  const {
    entry,
    difficulty,
    edge,
    seats,
    totalSeats,
    pilotRecommended,
    coexistence,
    trainingLoad,
  } = inputs;

  const share = seatShare(seats, totalSeats);
  const items: Weighted[] = [];

  const add = (
    pkg: WorkPackage,
    weight: number,
    code: string,
    params: RationaleItem["params"] = {},
    evidence: RationaleItem["evidence"] = [],
  ) => {
    if (weight <= 0) return;
    items.push({
      package: pkg,
      weight,
      reasons: [rationale({ code, params, evidence })],
    });
  };

  // Preparation always exists and grows with how hard the move is: deciding how
  // the new system is to be set up is most of the work on a difficult one.
  add(
    "preparation",
    0.8 + 0.4 * ((difficulty.score - 1) / 4),
    "effort.preparation_scales_with_difficulty",
    { difficulty: difficulty.score },
    [{ field: "difficulty", value: difficulty.score }],
  );

  // Data migration only where the rulepack says this specific move has data to
  // carry. A generic "Datenmigration" line on a move with nothing to migrate is
  // padding, and padding is what makes an estimate untrustworthy.
  if (edge && edge.dataMigration.effort >= 3) {
    add(
      "data_migration",
      0.3 * edge.dataMigration.effort * (edge.dataMigration.toolingExists ? 0.6 : 1),
      edge.dataMigration.toolingExists
        ? "effort.data_migration_with_tooling"
        : "effort.data_migration_without_tooling",
      { effort: edge.dataMigration.effort },
      [{ field: "migrationEdge", value: `${edge.from}->${edge.to}` }],
    );
  }

  if (pilotRecommended) {
    add("pilot", 0.5, "effort.pilot_before_rollout", { seats }, [
      { field: "stack.seats", value: seats },
    ]);
  }

  // The rollout itself: the part that scales with how many people are carried.
  add("rollout", 0.9 + 1.4 * share, "effort.rollout_scales_with_seats", { seats }, [
    { field: "stack.seats", value: seats },
  ]);

  // Training is where seat count and the organization's own sensitivity meet.
  // The rulepack's training load matters here and nowhere else in the estimate.
  const trainingWeight =
    levelToUnit(entry.trainingSensitivity) * ((trainingLoad - 1) / 4) * (0.6 + share);
  if (trainingWeight > 0) {
    add(
      "training",
      trainingWeight * 2,
      "effort.training_scales_with_sensitivity_and_seats",
      { seats, sensitivity: entry.trainingSensitivity },
      [
        { field: "stack.trainingSensitivity", value: entry.trainingSensitivity },
        { field: "target.trainingLoad", value: trainingLoad },
      ],
    );
  }

  // Running both systems side by side costs real time, and only exists where
  // the two *can* coexist. Where they cannot, the migration is a cutover — which
  // is cheaper here and much riskier, and the report says so elsewhere.
  if (coexistence === "poor") {
    add("parallel_run", 0.25, "effort.cutover_because_no_parallel_operation", {}, [
      { field: "target.coexistence", value: coexistence },
    ]);
  } else {
    add(
      "parallel_run",
      0.3 + 0.5 * levelToUnit(entry.criticality),
      "effort.parallel_run_scales_with_criticality",
      { criticality: entry.criticality },
      [{ field: "stack.criticality", value: entry.criticality }],
    );
  }

  // The weeks after go-live, when the questions arrive. Always present, because
  // a plan that ends at the rollout date is the one that overruns.
  add("aftercare", 0.4 + 0.4 * share, "effort.aftercare_after_go_live", { seats }, [
    { field: "stack.seats", value: seats },
  ]);

  return items;
}

/**
 * Distributes a day total across weighted packages so the parts sum to it exactly.
 *
 * Largest-remainder rather than naive rounding: rounding each share
 * independently loses or gains a day or two, and a breakdown that does not add
 * up to its own total is worse than no breakdown at all — it is the first thing
 * a sceptical reader checks.
 */
function distribute(total: number, weights: readonly number[]): number[] {
  const sum = weights.reduce((acc, weight) => acc + weight, 0);
  if (sum <= 0 || weights.length === 0) return weights.map(() => 0);

  const exact = weights.map((weight) => (weight / sum) * total);
  const floored = exact.map((value) => Math.floor(value));
  let remainder = total - floored.reduce((acc, value) => acc + value, 0);

  // Hand the leftover days to the largest fractional parts, biggest first, with
  // the index as a tiebreak so two identical weights always resolve the same way.
  const order = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);

  const result = [...floored];
  for (const { index } of order) {
    if (remainder <= 0) break;
    result[index] = (result[index] ?? 0) + 1;
    remainder -= 1;
  }

  return result;
}

/**
 * Breaks a migration's day range into named packages.
 *
 * The band is the input, not the output. `days` is whatever `capacity.ts`
 * already decided; this only says what is inside it.
 */
export function decomposeEffort(
  days: { min: number; max: number },
  inputs: EffortInputs,
): EffortItem[] {
  const weighted = weightsFor(inputs);
  if (weighted.length === 0) return [];

  const weights = weighted.map((item) => item.weight);
  const mins = distribute(days.min, weights);
  const maxes = distribute(days.max, weights);

  const items = weighted.map((item, index) => ({
    package: item.package,
    days: { min: mins[index] ?? 0, max: maxes[index] ?? 0 },
    reasons: item.reasons,
  }));

  // Rendered in the order the work happens, not in weight order. A breakdown
  // sorted by size reads as a cost table; sorted by sequence it reads as a plan.
  const order = new Map(WORK_PACKAGES.map((pkg, index) => [pkg, index]));
  return items.sort(
    (a, b) => (order.get(a.package) ?? 0) - (order.get(b.package) ?? 0),
  );
}
