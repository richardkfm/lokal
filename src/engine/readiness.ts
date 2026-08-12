import { levelToUnit, type ReadinessLabel } from "@/domain/enums";
import { rationale, type RationaleItem } from "@/domain/rationale";
import type { NormalizedAssessment } from "./normalize";

/**
 * Stage 1 — readiness profile.
 *
 * Five capability bands, each 0–100 with the inputs that produced it. This is the
 * stage that answers "where are we underprepared", and the cross-checks at the
 * end are the part that a tool comparison can never do: they look for
 * combinations of answers that are individually reasonable and jointly a problem.
 */

export type Band = {
  score: number;
  label: ReadinessLabel;
  drivers: RationaleItem[];
};

export type ReadinessProfile = {
  /** Can this organization run software itself? */
  opsCapability: Band;
  /** Can it absorb the disruption of changing how people work? */
  changeCapacity: Band;
  /** Are accounts and access under control enough to build on? */
  identityReadiness: Band;
  /** How much external support will it need? Higher means more. */
  supportNeed: Band;
  /** Is local AI realistic here at all? */
  aiReadiness: Band;
  overall: Band;
  gaps: RationaleItem[];
};

function label(score: number): ReadinessLabel {
  if (score < 30) return "weak";
  if (score < 55) return "developing";
  if (score < 80) return "solid";
  return "strong";
}

function band(score: number, drivers: RationaleItem[]): Band {
  const clamped = Math.round(Math.min(Math.max(score, 0), 100));
  return { score: clamped, label: label(clamped), drivers };
}

const LINUX_UNIT = { none: 0, basic: 0.5, strong: 1 } as const;
const HARDWARE_UNIT = {
  none: 0,
  office_pcs: 0.35,
  server: 0.7,
  gpu_capable: 1,
} as const;
const AI_INTEREST_UNIT = { none: 0, cautious: 0.5, active: 1 } as const;

function driver(code: string, field: string, value: unknown): RationaleItem {
  return rationale({ code, severity: "info", evidence: [{ field, value }] });
}

export function assessReadiness(assessment: NormalizedAssessment): ReadinessProfile {
  const { input, derived } = assessment;
  const { operating, org, ai } = input;

  // --- Operations capability ------------------------------------------------
  // Weighted toward hands-on Linux capability and available admin time, because
  // those are what actually break a self-hosting plan. Stated IT maturity is the
  // softest of the three and is weighted accordingly.
  const opsCapability = band(
    100 *
      (0.4 * LINUX_UNIT[operating.linuxCapability] +
        0.3 * levelToUnit(operating.adminCapacity) +
        0.2 * levelToUnit(operating.itMaturity) +
        0.1 * (operating.supportExpectation === "community_tolerant" ? 1 : 0)),
    [
      driver(
        "driver.linux_capability",
        "operating.linuxCapability",
        operating.linuxCapability,
      ),
      driver(
        "driver.admin_capacity",
        "operating.adminCapacity",
        operating.adminCapacity,
      ),
      driver("driver.it_maturity", "operating.itMaturity", operating.itMaturity),
    ],
  );

  // --- Change capacity ------------------------------------------------------
  // Larger organizations and wider department spread make change harder, not
  // easier: more people to train, more local practice to unpick.
  const changeCapacity = band(
    100 *
      (0.4 * levelToUnit(operating.itMaturity) +
        0.3 * levelToUnit(operating.adminCapacity) +
        0.3 * (1 - derived.seatWeight) -
        0.1 * levelToUnit(derived.departmentSpread)),
    [
      driver("driver.organization_size", "org.totalSeats", org.totalSeats),
      driver("driver.department_spread", "org.departments", org.departments.length),
      driver(
        "driver.admin_capacity",
        "operating.adminCapacity",
        operating.adminCapacity,
      ),
    ],
  );

  // --- Identity readiness ---------------------------------------------------
  const identityReadiness = band(
    100 *
      (0.7 * levelToUnit(operating.identityMaturity) +
        0.3 * levelToUnit(operating.itMaturity)),
    [
      driver(
        "driver.identity_maturity",
        "operating.identityMaturity",
        operating.identityMaturity,
      ),
    ],
  );

  // --- Support need ---------------------------------------------------------
  // Inverted: a high score means more external help is likely required.
  const supportNeed = band(
    100 *
      (0.4 * (1 - LINUX_UNIT[operating.linuxCapability]) +
        0.3 * (1 - levelToUnit(operating.adminCapacity)) +
        0.2 * (operating.supportExpectation === "vendor_support_needed" ? 1 : 0) +
        0.1 * derived.seatWeight),
    [
      driver(
        "driver.support_expectation",
        "operating.supportExpectation",
        operating.supportExpectation,
      ),
      driver(
        "driver.linux_capability",
        "operating.linuxCapability",
        operating.linuxCapability,
      ),
    ],
  );

  // --- AI readiness ---------------------------------------------------------
  // Hardware is the hard constraint; interest without hardware is an aspiration,
  // and hardware without operations capability is a server nobody maintains.
  //
  // With no hardware at all, local AI is not realistic however capable the
  // organization is otherwise — something has to be procured first. So the score
  // is capped into the weak band rather than letting organizational maturity
  // paper over a missing prerequisite.
  const rawAiReadiness =
    100 *
    (0.4 * HARDWARE_UNIT[ai.hardwareProfile] +
      0.25 * AI_INTEREST_UNIT[ai.interest] +
      0.2 * (opsCapability.score / 100) +
      0.15 * (identityReadiness.score / 100));

  const aiReadiness = band(
    ai.hardwareProfile === "none" ? Math.min(rawAiReadiness, 25) : rawAiReadiness,
    [
      driver("driver.hardware_profile", "ai.hardwareProfile", ai.hardwareProfile),
      driver("driver.ai_interest", "ai.interest", ai.interest),
      driver("driver.data_sensitivity", "ai.dataSensitivity", ai.dataSensitivity),
    ],
  );

  const overall = band(
    0.3 * opsCapability.score +
      0.3 * changeCapacity.score +
      0.25 * identityReadiness.score +
      0.15 * (100 - supportNeed.score),
    [],
  );

  // --- Cross-checks ---------------------------------------------------------
  // Individually reasonable answers that are jointly a problem. These are the
  // findings a reader cannot get from comparing products.
  const gaps: RationaleItem[] = [];

  if (
    operating.hostingPreference === "self_hosted" &&
    operating.linuxCapability === "none"
  ) {
    gaps.push(
      rationale({
        code: "gap.self_hosting_without_linux_capability",
        severity: "caution",
        evidence: [
          { field: "operating.hostingPreference", value: operating.hostingPreference },
          { field: "operating.linuxCapability", value: operating.linuxCapability },
        ],
      }),
    );
  }

  if (operating.identityMaturity === "low" && org.totalSeats >= 50) {
    gaps.push(
      rationale({
        code: "gap.identity_foundation_missing_at_scale",
        severity: "caution",
        params: { totalSeats: org.totalSeats },
        evidence: [
          { field: "operating.identityMaturity", value: operating.identityMaturity },
          { field: "org.totalSeats", value: org.totalSeats },
        ],
      }),
    );
  }

  if (operating.adminCapacity === "low" && assessment.input.stack.length >= 4) {
    gaps.push(
      rationale({
        code: "gap.many_migrations_with_low_admin_capacity",
        severity: "caution",
        params: { categories: assessment.input.stack.length },
        evidence: [
          { field: "operating.adminCapacity", value: operating.adminCapacity },
          { field: "stack", value: assessment.input.stack.length },
        ],
      }),
    );
  }

  if (ai.interest === "active" && ai.hardwareProfile === "none") {
    gaps.push(
      rationale({
        code: "gap.ai_ambition_without_hardware",
        severity: "caution",
        evidence: [
          { field: "ai.interest", value: ai.interest },
          { field: "ai.hardwareProfile", value: ai.hardwareProfile },
        ],
      }),
    );
  }

  if (ai.dataSensitivity === "high" && ai.deploymentPreference === "eu_hosted") {
    gaps.push(
      rationale({
        code: "gap.sensitive_data_with_external_inference",
        severity: "caution",
        evidence: [
          { field: "ai.dataSensitivity", value: ai.dataSensitivity },
          { field: "ai.deploymentPreference", value: ai.deploymentPreference },
        ],
      }),
    );
  }

  const urgentAndCritical = assessment.input.stack.filter(
    (entry) => entry.urgency === "now" && entry.criticality === "high",
  );
  if (urgentAndCritical.length >= 2 && changeCapacity.label !== "strong") {
    gaps.push(
      rationale({
        code: "gap.several_urgent_critical_migrations_at_once",
        severity: "caution",
        params: { count: urgentAndCritical.length },
        evidence: [{ field: "stack", value: urgentAndCritical.map((e) => e.category) }],
      }),
    );
  }

  return {
    opsCapability,
    changeCapacity,
    identityReadiness,
    supportNeed,
    aiReadiness,
    overall,
    gaps,
  };
}
