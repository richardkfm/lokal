import { type ClientOsVerdict, type PhaseId, levelToUnit } from "@/domain/enums";
import { rationale, type RationaleItem } from "@/domain/rationale";
import type { ClientOsGate, Rulepack } from "@/rulepack/schema";
import type { NormalizedAssessment } from "./normalize";
import type { Sequencing } from "./sequencing";

/**
 * The client operating system.
 *
 * Every other stage plans applications. This one plans the thing they run on,
 * and for the Microsoft-shop SME and Kommune lokal is aimed at, that is the
 * largest single piece of lock-in in the building — and the piece lokal had
 * nothing at all to say about until now.
 *
 * What it produces is a verdict with reasons, never a product. There is no
 * distribution anywhere in this module and no place to put one: which Linux to
 * use depends on procurement, support contracts and the skills already in the
 * building, and answering it from five intake answers would be exactly the
 * alternatives-finder output lokal exists not to produce. The deferral is
 * recorded in plans/roadmap.md.
 *
 * The most common verdict is `after_apps` — possible, but not yet, and here is
 * what has to be finished first. That is `keep for now` applied to the desktop,
 * and it is one of the outputs CLAUDE.md names as proving the thesis.
 */

export type GateStatus = {
  gate: ClientOsGate;
  /**
   * `met` and `open` are decided from the assessment. `manual` means lokal
   * cannot decide it at all and the organization has to check and confirm —
   * shown as outstanding rather than ticked off on the reader's behalf, because
   * a checklist that completes itself is not a checklist.
   */
  status: "met" | "open" | "manual";
};

export type ClientOsLaneAssessment = {
  verdict: ClientOsVerdict;
  /** The phase the swap belongs in, or null when it is not in this plan. */
  phase: PhaseId | null;
  gates: GateStatus[];
  /** Devices the estimate was computed for, and where that number came from. */
  devices: { count: number; source: "declared" | "seats" } | null;
  effortDays: { min: number; max: number } | null;
  blockers: RationaleItem[];
  cautions: RationaleItem[];
  reasons: RationaleItem[];
};

/** An absent lane: the pack predates the question and must say so, not guess. */
function laneAbsent(pack: Rulepack): ClientOsLaneAssessment {
  return {
    verdict: "not_assessed",
    phase: null,
    gates: [],
    devices: null,
    effortDays: null,
    blockers: [],
    cautions: [],
    reasons: [
      rationale({
        code: "client_os.lane_absent_from_rulepack",
        severity: "note",
        params: { version: pack.version },
      }),
    ],
  };
}

function gateStatuses(
  gates: readonly ClientOsGate[],
  assessment: NormalizedAssessment,
  scheduledCategories: readonly string[],
): GateStatus[] {
  const { workplace, operating } = assessment.input;

  return gates.map((gate) => {
    if (gate.kind === "manual") return { gate, status: "manual" as const };

    switch (gate.id) {
      case "crossplatform-app-stack":
        // Met once the plan actually moves the applications. The gate is about
        // the plan being carried out, so "scheduled" is as far as the engine
        // can honestly go — and it is what makes the ordering visible.
        return {
          gate,
          status: scheduledCategories.length > 0 ? ("met" as const) : ("open" as const),
        };
      case "fachverfahren-inventory":
        return {
          gate,
          status:
            workplace.windowsOnlyApps === "unknown"
              ? ("open" as const)
              : ("met" as const),
        };
      case "endpoint-management":
        return {
          gate,
          status:
            workplace.deviceManagement === "none" ||
            workplace.deviceManagement === "unknown"
              ? ("open" as const)
              : ("met" as const),
        };
      case "identity-independent-of-gpo":
        return {
          gate,
          status:
            workplace.deviceManagement === "ad_gpo" &&
            operating.identityMaturity !== "high"
              ? ("open" as const)
              : ("met" as const),
        };
      default:
        return { gate, status: "open" as const };
    }
  });
}

/**
 * Devices to plan for.
 *
 * Seats are a fallback, not an equivalent: shared workstations, shift work and
 * second devices move the real number in both directions. Where the fallback is
 * used the report says so, rather than presenting a seat count as a device count.
 */
function deviceBasis(assessment: NormalizedAssessment): {
  count: number;
  source: "declared" | "seats";
} {
  const declared = assessment.input.workplace.deviceCount;
  if (declared !== undefined) return { count: declared, source: "declared" };
  return { count: assessment.input.org.totalSeats, source: "seats" };
}

export function assessClientOs(
  assessment: NormalizedAssessment,
  sequencing: Sequencing,
  pack: Rulepack,
): ClientOsLaneAssessment {
  const lane = pack.clientOsLane;
  if (!lane) return laneAbsent(pack);

  const { workplace } = assessment.input;
  const scheduledCategories = sequencing.phases.flatMap((phase) =>
    phase.migrations.map((migration) => migration.category),
  );

  // Nothing was asked, so nothing is asserted. An older assessment reaches this
  // branch, and so does a respondent who genuinely does not know — in both cases
  // naming the unanswered question beats inventing an estate.
  if (workplace.clientOs === "unknown") {
    return {
      verdict: "not_assessed",
      phase: null,
      gates: [],
      devices: null,
      effortDays: null,
      blockers: [],
      cautions: [],
      reasons: [
        rationale({
          code: "client_os.verdict_not_assessed",
          severity: "note",
          evidence: [{ field: "workplace.clientOs", value: workplace.clientOs }],
        }),
      ],
    };
  }

  if (workplace.clientOs === "linux") {
    return {
      verdict: "already_open",
      phase: null,
      gates: [],
      devices: null,
      effortDays: null,
      blockers: [],
      cautions: [],
      reasons: [
        rationale({
          code: "client_os.verdict_already_open",
          evidence: [{ field: "workplace.clientOs", value: workplace.clientOs }],
        }),
      ],
    };
  }

  const context = { input: assessment.input, scheduledCategories };
  const fired = lane.rules.filter((rule) => rule.when(context));

  const blockers = fired
    .filter((rule) => rule.severity === "blocker")
    .map((rule) =>
      rationale({
        code: rule.message,
        severity: "blocker",
        evidence: [
          { field: "workplace.windowsOnlyApps", value: workplace.windowsOnlyApps },
          {
            field: "workplace.peripheralDependency",
            value: workplace.peripheralDependency,
          },
        ],
      }),
    );

  const cautions = fired
    .filter((rule) => rule.severity === "caution")
    .map((rule) =>
      rationale({
        code: rule.message,
        severity: "caution",
        evidence: [
          { field: "workplace.deviceManagement", value: workplace.deviceManagement },
        ],
      }),
    );

  const gates = gateStatuses(lane.gates, assessment, scheduledCategories);
  const devices = deviceBasis(assessment);

  const reasons: RationaleItem[] = [];

  if (devices.source === "seats") {
    reasons.push(
      rationale({
        code: "client_os.device_count_fell_back_to_seats",
        severity: "note",
        params: { seats: devices.count },
        evidence: [{ field: "workplace.deviceCount", value: "not stated" }],
      }),
    );
  }

  // Said in every verdict that reaches a reader, because it is the boundary of
  // what lokal claims and the question they will ask next.
  reasons.push(rationale({ code: "client_os.no_distribution_named" }));

  if (blockers.length > 0) {
    // A mixed estate is a legitimate outcome. Saying so matters: an
    // organization told "blockiert" without it concludes the whole idea is
    // dead, when what is actually true is that some desks stay on Windows.
    const partial =
      workplace.windowsOnlyApps === "few" || workplace.windowsOnlyApps === "several";

    return {
      verdict: "blocked",
      phase: null,
      gates,
      devices,
      effortDays: null,
      blockers,
      cautions,
      reasons: [
        rationale({ code: "client_os.verdict_blocked", severity: "caution" }),
        ...(partial
          ? [rationale({ code: "client_os.mixed_estate_is_a_valid_outcome" })]
          : []),
        ...reasons,
      ],
    };
  }

  // The doctrine, applied. The swap goes after everything the plan already
  // schedules — never into an earlier phase, whatever its value-versus-cost
  // score would say, because the applications are its prerequisite.
  const lastOccupied = Math.max(
    0,
    ...sequencing.phases
      .filter((phase) => phase.migrations.length > 0)
      .map((phase) => phase.id),
  );
  const phase = Math.min(lastOccupied + 1, 4) as PhaseId;

  // Fixed preparation plus a per-device cost. Training sensitivity lengthens the
  // per-device end: a change this visible costs more time at each desk when the
  // organization said its people are sensitive to being retrained.
  const sensitivity = levelToUnit(
    assessment.input.stack[0]?.trainingSensitivity ?? "medium",
  );
  const perDevice = {
    min: lane.daysPerDevice.min,
    max: lane.daysPerDevice.max * (1 + 0.5 * sensitivity),
  };

  const effortDays = {
    min: Math.round(lane.fixedDays.min + perDevice.min * devices.count),
    max: Math.round(lane.fixedDays.max + perDevice.max * devices.count),
  };

  return {
    verdict: "after_apps",
    phase,
    gates,
    devices,
    effortDays,
    blockers: [],
    cautions,
    reasons: [
      rationale({
        code: "client_os.verdict_after_apps",
        evidence: [{ field: "workplace.clientOs", value: workplace.clientOs }],
      }),
      rationale({ code: "client_os.doctrine_os_moves_last" }),
      ...reasons,
    ],
  };
}
