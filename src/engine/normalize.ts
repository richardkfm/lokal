import {
  INHERENTLY_PUBLIC_ORG_TYPES,
  type CategoryId,
  type Level,
  type SizeBucket,
  sizeBucketForSeats,
} from "@/domain/enums";
import { CATEGORY_IDS } from "@/domain/enums";
import { rationale, type RationaleItem } from "@/domain/rationale";
import type { AssessmentInput } from "@/domain/intake";

/**
 * Stage 0 — normalize.
 *
 * Derives the facts every later stage relies on, and raises data-quality notes
 * where the answers look implausible. It never rejects an assessment for
 * implausibility: people know their own organization, and a planning tool that
 * argues with its user instead of flagging a doubt is not useful.
 */

export type NormalizedAssessment = {
  input: AssessmentInput;
  derived: {
    sizeBucket: SizeBucket;
    /** Log-scaled seat pressure in 0..1, used to scale effort and risk. */
    seatWeight: number;
    assessedCategories: CategoryId[];
    /** Declared in the vocabulary but not assessed — reported, never assumed fine. */
    unassessedCategories: CategoryId[];
    /** Change-management surface: how many parts of the organization are touched. */
    departmentSpread: Level;
    /** True for organization types carrying public-sector expectations. */
    publicSectorProfile: boolean;
    /** How strongly this organization needs data-location and exit control (1–5). */
    sovereigntyDemand: 1 | 2 | 3 | 4 | 5;
    /** Total seats across assessed categories, which may exceed the org total. */
    totalAffectedSeats: number;
  };
  notes: RationaleItem[];
};

/**
 * Seat pressure grows quickly at first and then flattens: going from 10 to 100
 * seats changes a migration fundamentally, 1000 to 1090 does not.
 */
export function seatWeight(seats: number): number {
  const scaled = Math.log10(Math.max(seats, 1)) / 3;
  return Math.min(Math.max(scaled, 0), 1);
}

function departmentSpread(count: number): Level {
  if (count <= 2) return "low";
  if (count <= 6) return "medium";
  return "high";
}

function sovereigntyDemand(
  input: AssessmentInput,
  publicSector: boolean,
): 1 | 2 | 3 | 4 | 5 {
  let score = 2;
  if (publicSector) score += 1;
  if (input.operating.hostingPreference === "self_hosted") score += 1;
  if (input.ai.dataSensitivity === "high") score += 1;
  if (input.operating.hostingPreference === "undecided") score -= 1;

  return Math.min(Math.max(score, 1), 5) as 1 | 2 | 3 | 4 | 5;
}

export function normalize(input: AssessmentInput): NormalizedAssessment {
  const notes: RationaleItem[] = [];

  const assessedCategories = input.stack.map((entry) => entry.category);
  const unassessedCategories = CATEGORY_IDS.filter(
    (id) => !assessedCategories.includes(id),
  );

  const publicSectorProfile =
    input.org.publicSector ||
    (INHERENTLY_PUBLIC_ORG_TYPES as readonly string[]).includes(input.org.orgType);

  if (!input.org.publicSector && publicSectorProfile) {
    notes.push(
      rationale({
        code: "note.public_sector_implied_by_org_type",
        severity: "note",
        params: { orgType: input.org.orgType },
        evidence: [{ field: "org.orgType", value: input.org.orgType }],
      }),
    );
  }

  const totalAffectedSeats = input.stack.reduce((sum, entry) => sum + entry.seats, 0);

  // Per-category seats legitimately differ from the organization total — a
  // helpdesk may serve twelve people in a 180-seat authority. A single category
  // claiming far more seats than the organization has is a different matter, and
  // it silently distorts every effort and training estimate downstream.
  for (const entry of input.stack) {
    if (entry.seats > input.org.totalSeats * 1.2) {
      notes.push(
        rationale({
          code: "note.category_seats_exceed_organization",
          severity: "caution",
          params: {
            category: entry.category,
            seats: entry.seats,
            totalSeats: input.org.totalSeats,
          },
          evidence: [
            { field: `stack.${entry.category}.seats`, value: entry.seats },
            { field: "org.totalSeats", value: input.org.totalSeats },
          ],
        }),
      );
    }
  }

  if (unassessedCategories.length > 0) {
    notes.push(
      rationale({
        code: "note.categories_not_assessed",
        severity: "note",
        params: { count: unassessedCategories.length },
        evidence: [{ field: "stack", value: assessedCategories }],
      }),
    );
  }

  if (input.org.departments.length === 0 && input.org.totalSeats > 50) {
    notes.push(
      rationale({
        code: "note.no_departments_named",
        severity: "note",
        params: { totalSeats: input.org.totalSeats },
        evidence: [{ field: "org.departments", value: [] }],
      }),
    );
  }

  return {
    input,
    derived: {
      sizeBucket: sizeBucketForSeats(input.org.totalSeats),
      seatWeight: seatWeight(input.org.totalSeats),
      assessedCategories,
      unassessedCategories,
      departmentSpread: departmentSpread(input.org.departments.length),
      publicSectorProfile,
      sovereigntyDemand: sovereigntyDemand(input, publicSectorProfile),
      totalAffectedSeats,
    },
    notes,
  };
}
