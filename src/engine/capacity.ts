import { levelToUnit, type CategoryId, type PhaseId } from "@/domain/enums";
import { rationale, type RationaleItem } from "@/domain/rationale";
import { decomposeEffort, type EffortItem } from "./effort";
import type { NormalizedAssessment } from "./normalize";
import type { ReadinessProfile } from "./readiness";
import type { Phase, Sequencing } from "./sequencing";

/**
 * Stage 6 — capacity.
 *
 * Confronts the plan with the time the organization actually has. This is the
 * stage that turns a sensible-looking roadmap into an honest one: a plan needing
 * sixty administrator-days from a half-time administrator is not a plan.
 *
 * Every figure is a range and every range is a planning estimate, never a quote.
 * The report says so, because a band presented as a number gets quoted back as
 * one.
 */

export const EFFORT_BANDS = ["xs", "s", "m", "l", "xl"] as const;
export type EffortBand = (typeof EFFORT_BANDS)[number];

/** Administrator-days, as a range. Deliberately wide. */
const BAND_DAYS: Record<EffortBand, { min: number; max: number }> = {
  xs: { min: 1, max: 3 },
  s: { min: 3, max: 8 },
  m: { min: 8, max: 18 },
  l: { min: 18, max: 35 },
  xl: { min: 35, max: 70 },
};

export type MigrationEffort = {
  category: CategoryId;
  band: EffortBand;
  days: { min: number; max: number };
  /**
   * What the range is made of. Explains the number; never changes it — the
   * items sum exactly to `days`, and a test asserts that for every fixture.
   */
  items: EffortItem[];
  /** True when a pilot is a better first step than a broad rollout. */
  pilotRecommended: boolean;
  /** True when this is likely to need outside help. */
  externalSupportLikely: boolean;
  reasons: RationaleItem[];
};

export type PhaseCapacity = {
  phase: PhaseId;
  days: { min: number; max: number };
  efforts: MigrationEffort[];
};

export type CapacityAssessment = {
  perPhase: PhaseCapacity[];
  total: { min: number; max: number };
  /** Administrator-days plausibly available per year for migration work. */
  availablePerYear: { min: number; max: number };
  gaps: RationaleItem[];
  pilotsRecommended: CategoryId[];
  externalSupportFor: CategoryId[];
};

/**
 * Administrator-days per year an organization can realistically put into
 * migration work on top of running what it already has. These bands are
 * judgements about spare capacity, not headcount.
 */
const AVAILABLE_DAYS: Record<"low" | "medium" | "high", { min: number; max: number }> =
  {
    low: { min: 5, max: 20 },
    medium: { min: 20, max: 60 },
    high: { min: 60, max: 150 },
  };

/**
 * Picks a band, and says why it picked that one.
 *
 * The reasons are the point. This function used to return a band and emit
 * nothing, so the report printed "3–8 Tage" with no way for the reader to see
 * that the figure came from a difficulty of 2.4 and a seat count under 250.
 * A planning estimate nobody can interrogate is an assertion.
 */
function bandFor(
  difficulty: number,
  seats: number,
): { band: EffortBand; reasons: RationaleItem[] } {
  // Difficulty sets the floor; seat count moves it up, because the same
  // technical migration costs more when more people have to be carried through it.
  let index = difficulty < 2 ? 0 : difficulty < 3 ? 1 : difficulty < 4 ? 2 : 3;

  const reasons: RationaleItem[] = [
    rationale({
      code: "effort.band_from_difficulty",
      params: { difficulty, band: EFFORT_BANDS[index]! },
      evidence: [{ field: "difficulty", value: difficulty }],
    }),
  ];

  if (seats > 250) {
    index += 1;
    reasons.push(
      rationale({
        code: "effort.band_raised_by_seat_count",
        params: { seats, threshold: 250 },
        evidence: [{ field: "stack.seats", value: seats }],
      }),
    );
  }
  if (seats > 2000) {
    index += 1;
    reasons.push(
      rationale({
        code: "effort.band_raised_by_seat_count",
        params: { seats, threshold: 2000 },
        evidence: [{ field: "stack.seats", value: seats }],
      }),
    );
  }

  const capped = Math.min(index, EFFORT_BANDS.length - 1);
  if (capped < index) {
    reasons.push(
      rationale({
        code: "effort.band_capped_at_largest",
        severity: "note",
        params: { band: EFFORT_BANDS[capped]! },
      }),
    );
  }

  return { band: EFFORT_BANDS[capped]!, reasons };
}

export function assessCapacity(
  sequencing: Sequencing,
  assessment: NormalizedAssessment,
  readiness: ReadinessProfile,
): CapacityAssessment {
  const pilotsRecommended: CategoryId[] = [];
  const externalSupportFor: CategoryId[] = [];

  const perPhase: PhaseCapacity[] = sequencing.phases.map((phase: Phase) => {
    const efforts = phase.migrations.map((migration): MigrationEffort => {
      const { band, reasons: bandReasons } = bandFor(
        migration.difficulty.score,
        migration.seats,
      );
      const reasons: RationaleItem[] = [...bandReasons];
      const days = BAND_DAYS[band];
      const tool = migration.recommendation.primary!.tool;
      const entry = migration.recommendation.entry;

      // A pilot is the better first step where the migration is genuinely hard,
      // or where a lot of people are sensitive to being retrained. Discovering
      // either at full rollout is expensive and public.
      const pilotRecommended =
        migration.difficulty.score >= 4 ||
        (migration.seats > 100 && entry.trainingSensitivity === "high");

      if (pilotRecommended) {
        pilotsRecommended.push(migration.category);
        reasons.push(
          rationale({
            code: "capacity.pilot_before_rollout",
            severity: "note",
            params: { category: migration.category, seats: migration.seats },
            evidence: [
              { field: "difficulty", value: migration.difficulty.score },
              { field: "stack.trainingSensitivity", value: entry.trainingSensitivity },
            ],
          }),
        );
      }

      // Outside help is likely where the product demands real operational
      // attention and the organization has little to give it.
      const externalSupportLikely =
        readiness.opsCapability.label === "weak" && tool.selfHostOpsLoad >= 4;

      if (externalSupportLikely) {
        externalSupportFor.push(migration.category);
        reasons.push(
          rationale({
            code: "capacity.external_support_likely",
            severity: "caution",
            params: { category: migration.category, tool: tool.name },
            evidence: [
              {
                field: "readiness.opsCapability",
                value: readiness.opsCapability.label,
              },
              { field: "target.selfHostOpsLoad", value: tool.selfHostOpsLoad },
            ],
          }),
        );
      }

      return {
        category: migration.category,
        band,
        days,
        items: decomposeEffort(days, {
          entry,
          difficulty: migration.difficulty,
          edge: migration.difficulty.edge,
          seats: migration.seats,
          totalSeats: assessment.input.org.totalSeats,
          pilotRecommended,
          coexistence: tool.coexistence,
          trainingLoad: tool.trainingLoad,
        }),
        pilotRecommended,
        externalSupportLikely,
        reasons,
      };
    });

    // Phase 0 is groundwork rather than migration, and it is real work.
    const prerequisiteDays = phase.prerequisites.reduce(
      (sum, prerequisite) => sum + prerequisite.effort * 2,
      0,
    );

    return {
      phase: phase.id,
      efforts,
      days: {
        min: efforts.reduce((sum, e) => sum + e.days.min, prerequisiteDays),
        max: efforts.reduce(
          (sum, e) => sum + e.days.max,
          Math.round(prerequisiteDays * 2),
        ),
      },
    };
  });

  const total = perPhase.reduce(
    (acc, phase) => ({ min: acc.min + phase.days.min, max: acc.max + phase.days.max }),
    { min: 0, max: 0 },
  );

  const availablePerYear = AVAILABLE_DAYS[assessment.input.operating.adminCapacity];

  const gaps: RationaleItem[] = [];

  // The comparison that matters: can this organization carry this plan at all?
  if (total.min > availablePerYear.max) {
    gaps.push(
      rationale({
        code: "capacity.plan_exceeds_annual_capacity",
        severity: "caution",
        params: { minDays: total.min, availableDays: availablePerYear.max },
        evidence: [
          {
            field: "operating.adminCapacity",
            value: assessment.input.operating.adminCapacity,
          },
        ],
      }),
    );
  } else if (total.max > availablePerYear.max) {
    gaps.push(
      rationale({
        code: "capacity.plan_may_exceed_annual_capacity",
        severity: "note",
        params: { maxDays: total.max, availableDays: availablePerYear.max },
        evidence: [
          {
            field: "operating.adminCapacity",
            value: assessment.input.operating.adminCapacity,
          },
        ],
      }),
    );
  }

  const trainingHeavy = sequencing.phases
    .flatMap((phase) => phase.migrations)
    .filter(
      (migration) =>
        levelToUnit(migration.recommendation.entry.trainingSensitivity) === 1 &&
        migration.seats >= 50,
    );

  if (trainingHeavy.length > 0) {
    gaps.push(
      rationale({
        code: "capacity.significant_training_load",
        severity: "note",
        params: {
          count: trainingHeavy.length,
          seats: trainingHeavy.reduce((sum, m) => sum + m.seats, 0),
        },
        evidence: [{ field: "stack.trainingSensitivity", value: "high" }],
      }),
    );
  }

  if (readiness.supportNeed.score >= 70 && externalSupportFor.length === 0) {
    gaps.push(
      rationale({
        code: "capacity.budget_for_external_support",
        severity: "note",
        evidence: [
          { field: "readiness.supportNeed", value: readiness.supportNeed.label },
        ],
      }),
    );
  }

  return {
    perPhase,
    total,
    availablePerYear,
    gaps,
    pilotsRecommended,
    externalSupportFor,
  };
}
