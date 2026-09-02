import type { CategoryId } from "@/domain/enums";
import { rationale, type RationaleItem } from "@/domain/rationale";
import type { NormalizedAssessment } from "./normalize";
import type { CapacityAssessment } from "./capacity";
import type { ClientOsLaneAssessment } from "./workplace";

/**
 * What the migration costs, from rates the organization declared (ADR-0004).
 *
 * lokal still invents no price. ADR-0003 refused a net saving because "hosting,
 * support, training and internal time are real costs that lokal does not price"
 * — a statement about *lokal* inventing a price, not about an organization
 * declaring one. An internal day rate is a fact the organization knows and lokal
 * does not, so asking for it is the same move as asking for seat counts, and the
 * arithmetic stays as trivial as the exposure side: days the engine computed,
 * times a rate the respondent typed.
 *
 * What this module must never produce: a net saving, an ROI, a payback period or
 * a break-even point. Every ingredient such a figure needs — hosting for the new
 * stack, its support contracts, productivity during the changeover, the residual
 * licences an organization keeps — is a cost lokal explicitly does not model,
 * which is precisely why it cannot state one honestly. The report puts this
 * figure beside the exposure figure and says between them that they are not
 * subtractable.
 *
 * No rate declared means no figure. Not zero, not a regional average, not an
 * estimate from organization size — absent, with a note saying so. A plausible
 * placeholder looks discharged, which is the same reasoning that makes
 * `LOKAL_EXPERT_*` render nothing rather than an example contact.
 */

export type CostLine = {
  days: { min: number; max: number };
  /** Per day, in minor units, exactly as declared. */
  rateCents: number;
  cents: { min: number; max: number };
};

export type MigrationCost = {
  currency: "EUR";
  /** Effort carried in-house. Null when no internal rate was declared. */
  internal: CostLine | null;
  /** Effort likely to be bought in. Null when no external rate was declared. */
  external: CostLine | null;
  /** Both together, or null when neither rate was declared. */
  totalCents: { min: number; max: number } | null;
  /**
   * Which part of the plan the figure covers. Stated every time, so a partial
   * cost is never read as the whole (ADR-0004 guardrail 6).
   */
  coverage: {
    migrationsPriced: number;
    migrationsTotal: number;
    externalSupportMigrations: number;
    includesClientOs: boolean;
  };
  notes: RationaleItem[];
};

export function assessCost(
  assessment: NormalizedAssessment,
  capacity: CapacityAssessment,
  clientOs: ClientOsLaneAssessment,
): MigrationCost {
  const { internalDayRateCents, externalDayRateCents } = assessment.input.rates;
  const notes: RationaleItem[] = [];

  const efforts = capacity.perPhase.flatMap((phase) => phase.efforts);

  // External days are the days of the migrations the engine already flagged as
  // likely to need outside help. Inventing a second heuristic here would let the
  // cost section disagree with the capacity section about the same plan.
  const externalCategories = new Set<CategoryId>(capacity.externalSupportFor);
  const externalDays = efforts
    .filter((effort) => externalCategories.has(effort.category))
    .reduce(
      (acc, effort) => ({
        min: acc.min + effort.days.min,
        max: acc.max + effort.days.max,
      }),
      { min: 0, max: 0 },
    );

  // Everything else — including phase 0 groundwork, which is in the phase totals
  // but never in a per-migration effort — is carried in-house.
  const osDays = clientOs.effortDays ?? { min: 0, max: 0 };
  const internalDays = {
    min: capacity.total.min - externalDays.min + osDays.min,
    max: capacity.total.max - externalDays.max + osDays.max,
  };

  const line = (
    days: { min: number; max: number },
    rateCents: number | undefined,
  ): CostLine | null => {
    if (rateCents === undefined) return null;
    return {
      days,
      rateCents,
      cents: {
        min: Math.round(Math.max(0, days.min) * rateCents),
        max: Math.round(Math.max(0, days.max) * rateCents),
      },
    };
  };

  const internal = line(internalDays, internalDayRateCents);
  const external =
    externalDays.max > 0 ? line(externalDays, externalDayRateCents) : null;

  if (internalDayRateCents === undefined) {
    notes.push(
      rationale({
        code: "cost.no_internal_rate_declared",
        severity: "note",
        evidence: [{ field: "rates.internalDayRateCents", value: "not stated" }],
      }),
    );
  }

  if (externalDays.max > 0 && externalDayRateCents === undefined) {
    notes.push(
      rationale({
        code: "cost.external_support_likely_but_no_rate",
        severity: "caution",
        params: { count: externalCategories.size },
        evidence: [{ field: "rates.externalDayRateCents", value: "not stated" }],
      }),
    );
  }

  if (internal || external) {
    // The one caveat that has to survive a reader who only sees the figure.
    notes.push(rationale({ code: "cost.not_subtractable_from_exposure" }));
    notes.push(rationale({ code: "cost.estimate_not_a_quote" }));

    if (clientOs.effortDays) {
      notes.push(
        rationale({
          code: "cost.includes_client_os_swap",
          params: { min: clientOs.effortDays.min, max: clientOs.effortDays.max },
        }),
      );
    }
  }

  const totalCents =
    internal || external
      ? {
          min: (internal?.cents.min ?? 0) + (external?.cents.min ?? 0),
          max: (internal?.cents.max ?? 0) + (external?.cents.max ?? 0),
        }
      : null;

  return {
    currency: "EUR",
    internal,
    external,
    totalCents,
    coverage: {
      migrationsPriced: internal || external ? efforts.length : 0,
      migrationsTotal: efforts.length,
      externalSupportMigrations: externalCategories.size,
      includesClientOs: clientOs.effortDays !== null,
    },
    notes,
  };
}
