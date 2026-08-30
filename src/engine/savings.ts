import { levelToUnit, type OutlookBand } from "@/domain/enums";
import { rationale, type RationaleItem } from "@/domain/rationale";
import type { Rulepack } from "@/rulepack/schema";
import type { CapacityAssessment } from "./capacity";
import { assessExposure, type SubscriptionExposure } from "./exposure";
import type { NormalizedAssessment } from "./normalize";
import type { Sequencing } from "./sequencing";

/**
 * Stage 7 — savings outlook.
 *
 * The band is qualitative and stays that way. lokal has no pricing model, and an
 * invented figure is still the fastest way for a report to be dismissed by the
 * one person in the room who knows the real contract.
 *
 * What changed with ADR-0003 is that lokal now also states what the current
 * subscriptions cost — not as a model output, but as the organization's own
 * declared seat counts multiplied by prices their vendors publish. That figure
 * is computed in `./exposure` and carried here alongside the band, never in
 * place of it, and it is deliberately gross exposure rather than a saving:
 * hosting, support, training and staff time are real costs lokal does not price.
 *
 * So the section reads as three things in order: how strong the picture looks,
 * what is driving it and eating into it, and what the current invoices come to.
 */

export type SavingsOutlook = {
  band: OutlookBand;
  /** Where cost exposure genuinely falls. */
  drivers: RationaleItem[];
  /** What eats into it, and when. */
  offsets: RationaleItem[];
  /** How long costs are likely to run in parallel before the old system stops. */
  parallelRunPhases: number;
  /** Stated in the report so the band is never mistaken for a calculation. */
  modelLimitations: RationaleItem[];
  /**
   * Today's priced subscription exposure, or `null` when nothing in the stack
   * carries a citable published price. Never merged into the band: the band is
   * about direction, this is about invoices.
   */
  subscriptionExposure: SubscriptionExposure | null;
};

export function assessSavings(
  assessment: NormalizedAssessment,
  sequencing: Sequencing,
  capacity: CapacityAssessment,
  pack: Rulepack,
): SavingsOutlook {
  const drivers: RationaleItem[] = [];
  const offsets: RationaleItem[] = [];

  const scheduled = sequencing.phases.flatMap((phase) => phase.migrations);

  // --- Where exposure falls -------------------------------------------------
  // Licence exposure removed is a function of seats displaced weighted by how
  // locked-in the incumbent was. High lock-in on many seats is where the real
  // recurring exposure sits.
  let exposureScore = 0;

  for (const migration of scheduled) {
    const entry = migration.recommendation.entry;
    const currentTool = entry.currentTool;
    const source =
      currentTool.kind === "known"
        ? pack.sourceTools.find((tool) => tool.id === currentTool.id)
        : undefined;

    if (!source) continue;

    const seatShare = Math.min(
      entry.seats / Math.max(assessment.input.org.totalSeats, 1),
      1,
    );
    exposureScore += ((source.vendorLockIn - 1) / 4) * seatShare;

    if (source.vendorLockIn >= 4 && entry.seats >= 25) {
      drivers.push(
        rationale({
          code: "savings.recurring_licence_exposure_reduced",
          params: { tool: source.name, seats: entry.seats },
          evidence: [
            { field: "stack.currentTool", value: source.id },
            { field: "stack.seats", value: entry.seats },
          ],
        }),
      );
    }

    if (entry.lockInConcern === "high") {
      drivers.push(
        rationale({
          code: "savings.exit_options_improve",
          params: { category: entry.category },
          evidence: [{ field: "stack.lockInConcern", value: entry.lockInConcern }],
        }),
      );
    }
  }

  if (assessment.input.operating.hostingPreference === "self_hosted") {
    drivers.push(
      rationale({
        code: "savings.hosting_under_own_control",
        evidence: [
          {
            field: "operating.hostingPreference",
            value: assessment.input.operating.hostingPreference,
          },
        ],
      }),
    );
  }

  if (assessment.derived.publicSectorProfile) {
    drivers.push(
      rationale({
        code: "savings.procurement_flexibility",
        evidence: [{ field: "org.publicSector", value: true }],
      }),
    );
  }

  // --- What eats into it ----------------------------------------------------
  offsets.push(
    rationale({
      code: "savings.migration_effort_upfront",
      severity: "note",
      params: { minDays: capacity.total.min, maxDays: capacity.total.max },
      evidence: [{ field: "capacity.total", value: capacity.total.max }],
    }),
  );

  if (capacity.externalSupportFor.length > 0) {
    offsets.push(
      rationale({
        code: "savings.external_support_cost",
        severity: "note",
        params: { count: capacity.externalSupportFor.length },
        evidence: [
          { field: "capacity.externalSupportFor", value: capacity.externalSupportFor },
        ],
      }),
    );
  }

  const trainingSeats = scheduled
    .filter((m) => levelToUnit(m.recommendation.entry.trainingSensitivity) >= 0.5)
    .reduce((sum, m) => sum + m.seats, 0);

  if (trainingSeats > 0) {
    offsets.push(
      rationale({
        code: "savings.training_cost",
        severity: "note",
        params: { seats: trainingSeats },
        evidence: [{ field: "stack.trainingSensitivity", value: "medium_or_high" }],
      }),
    );
  }

  // Old and new systems overlap during a migration, and both cost money.
  const parallelRunPhases = sequencing.phases.filter(
    (phase) => phase.migrations.length > 0,
  ).length;

  if (parallelRunPhases > 1) {
    offsets.push(
      rationale({
        code: "savings.parallel_running_costs",
        severity: "note",
        params: { phases: parallelRunPhases },
        evidence: [{ field: "phases", value: parallelRunPhases }],
      }),
    );
  }

  if (assessment.input.operating.supportExpectation === "vendor_support_needed") {
    offsets.push(
      rationale({
        code: "savings.support_contracts_still_needed",
        severity: "note",
        evidence: [
          {
            field: "operating.supportExpectation",
            value: assessment.input.operating.supportExpectation,
          },
        ],
      }),
    );
  }

  // --- Band -----------------------------------------------------------------
  // Scaled by how much locked-in seat exposure the plan actually displaces,
  // damped where the organization will be buying support instead.
  const normalized = scheduled.length > 0 ? exposureScore / scheduled.length : 0;
  const supportDamping =
    assessment.input.operating.supportExpectation === "vendor_support_needed"
      ? 0.75
      : 1;
  const effective = normalized * supportDamping;

  const band: OutlookBand =
    effective >= 0.6 ? "strong" : effective >= 0.3 ? "moderate" : "low";

  const modelLimitations = [
    rationale({
      code: "savings.model_is_qualitative",
      severity: "note",
    }),
    rationale({
      code: "savings.excludes_internal_time_costs",
      severity: "note",
    }),
  ];

  return {
    band,
    drivers,
    offsets,
    parallelRunPhases,
    modelLimitations,
    subscriptionExposure: assessExposure(assessment, sequencing, pack),
  };
}
