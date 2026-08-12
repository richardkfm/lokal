import { rationale, type RationaleItem } from "@/domain/rationale";
import { REPORT_SCHEMA_VERSION, type PlanningReport, type ToolSummary } from "./schema";
import type { CategoryId } from "@/domain/enums";
import type { EngineResult } from "@/engine";
import type { ScoredCandidate } from "@/engine/candidates";
import type { Category, Rulepack, TargetTool } from "@/rulepack/schema";

/**
 * Stage 9 — compose the report.
 *
 * Flattens engine output into the plain-JSON document renderers consume. The
 * later sections — advantages, scalability outlook, next steps — are derived
 * here rather than in the engine, because they are re-presentations of findings
 * the engine already made rather than new analysis.
 *
 * `generatedAt` is injected rather than read from the clock, so the composer
 * stays pure and golden fixtures stay stable.
 */

function toolSummary(tool: TargetTool): ToolSummary {
  return {
    id: tool.id,
    name: tool.name,
    summary: tool.summary,
    license: tool.license,
    ...(tool.vendorCountry ? { vendorCountry: tool.vendorCountry } : {}),
    hostingModes: tool.hostingModes,
    sovereignty: tool.sovereignty,
    maturity: tool.maturity,
    supportModel: tool.supportModel,
    scalabilityNotes: tool.seatScalability.notes,
    comfortableUpTo: tool.seatScalability.comfortableUpTo,
    reviewStatus: tool.reviewStatus,
    sources: tool.sources,
  };
}

function candidate(scored: ScoredCandidate) {
  return {
    tool: toolSummary(scored.tool),
    score: scored.score,
    fitReasons: scored.fitReasons,
    cautions: scored.cautions,
  };
}

function currentToolName(
  result: EngineResult,
  category: CategoryId,
  pack: Rulepack,
): string | undefined {
  const entry = result.assessment.input.stack.find((e) => e.category === category);
  if (!entry) return undefined;

  const currentTool = entry.currentTool;
  if (currentTool.kind === "other") return currentTool.label;
  if (currentTool.kind === "none") return undefined;
  return pack.sourceTools.find((tool) => tool.id === currentTool.id)?.name;
}

/**
 * Overall migration posture, for the at-a-glance summary.
 *
 * Deliberately conservative: readiness gaps or a plan that outruns capacity
 * pull this down to "prepare first" regardless of how good the target stack is.
 * The stack being right does not make the organization ready.
 */
function migrationPosture(
  result: EngineResult,
): "prepare_first" | "start_selectively" | "proceed" {
  const overrun = result.capacity.gaps.some(
    (gap) => gap.code === "capacity.plan_exceeds_annual_capacity",
  );
  const seriousGaps = result.readiness.gaps.filter(
    (g) => g.severity === "caution",
  ).length;

  if (overrun || seriousGaps >= 3) return "prepare_first";
  if (seriousGaps >= 1 || result.readiness.overall.label === "developing") {
    return "start_selectively";
  }
  return "proceed";
}

/** Advantages, drawn from what the recommended stack actually provides. */
function advantages(result: EngineResult): RationaleItem[] {
  const items: RationaleItem[] = [];
  const chosen = result.recommendations
    .map((r) => r.primary?.tool)
    .filter((tool): tool is TargetTool => Boolean(tool));

  if (chosen.length === 0) return items;

  const avgSovereignty =
    chosen.reduce((sum, tool) => sum + tool.sovereignty, 0) / chosen.length;

  if (avgSovereignty >= 4) {
    items.push(
      rationale({
        code: "advantage.data_stays_under_own_control",
        params: { count: chosen.length },
        evidence: [
          { field: "targetStack.sovereignty", value: Math.round(avgSovereignty) },
        ],
      }),
    );
  }

  if (chosen.some((tool) => tool.hostingModes.includes("self_hosted"))) {
    items.push(
      rationale({
        code: "advantage.hosting_location_is_a_choice",
        evidence: [{ field: "targetStack.hostingModes", value: "self_hosted" }],
      }),
    );
  }

  const highLockIn = result.assessment.input.stack.filter(
    (entry) => entry.lockInConcern === "high",
  );
  if (highLockIn.length > 0) {
    items.push(
      rationale({
        code: "advantage.reduced_lock_in",
        params: { count: highLockIn.length },
        evidence: [{ field: "stack.lockInConcern", value: "high" }],
      }),
    );
  }

  items.push(
    rationale({
      code: "advantage.open_formats_and_exit_options",
      evidence: [{ field: "targetStack", value: chosen.map((tool) => tool.id) }],
    }),
  );

  if (chosen.some((tool) => tool.aiSuitability.localAiFriendly >= 4)) {
    items.push(
      rationale({
        code: "advantage.ready_for_local_ai",
        evidence: [{ field: "targetStack.aiSuitability", value: "localAiFriendly" }],
      }),
    );
  }

  if (result.assessment.derived.publicSectorProfile) {
    items.push(
      rationale({
        code: "advantage.aligns_with_public_sector_expectations",
        evidence: [{ field: "org.publicSector", value: true }],
      }),
    );
  }

  return items;
}

/**
 * Whether the recommended stack still holds as the organization changes.
 * This is what makes the report strategic rather than merely tactical.
 */
function scalability(result: EngineResult): PlanningReport["scalability"] {
  const chosen = result.recommendations
    .map((r) => r.primary?.tool)
    .filter((tool): tool is TargetTool => Boolean(tool));

  const seats = result.assessment.input.org.totalSeats;
  const tightest = chosen.reduce<TargetTool | null>(
    (lowest, tool) =>
      !lowest ||
      tool.seatScalability.comfortableUpTo < lowest.seatScalability.comfortableUpTo
        ? tool
        : lowest,
    null,
  );

  const headroom = tightest
    ? tightest.seatScalability.comfortableUpTo / Math.max(seats, 1)
    : 0;

  const currentSize = [
    rationale({
      code:
        headroom >= 2
          ? "scale.comfortable_at_current_size"
          : "scale.close_to_current_limit",
      params: { seats, ...(tightest ? { tool: tightest.name } : {}) },
      evidence: [{ field: "org.totalSeats", value: seats }],
    }),
  ];

  const growth = [
    rationale({
      code:
        headroom >= 3
          ? "scale.room_for_growth"
          : "scale.review_before_significant_growth",
      params: tightest
        ? {
            tool: tightest.name,
            comfortableUpTo: tightest.seatScalability.comfortableUpTo,
          }
        : {},
      evidence: [
        {
          field: "targetStack.comfortableUpTo",
          value: tightest?.seatScalability.comfortableUpTo ?? 0,
        },
      ],
    }),
  ];

  const moreDepartments = [
    rationale({
      code:
        result.readiness.identityReadiness.label === "weak"
          ? "scale.identity_needed_before_more_departments"
          : "scale.additional_departments_manageable",
      evidence: [
        {
          field: "readiness.identityReadiness",
          value: result.readiness.identityReadiness.label,
        },
      ],
    }),
  ];

  const stricterGovernance = [
    rationale({
      code: "scale.self_hosting_supports_stricter_rules",
      evidence: [{ field: "targetStack.sovereignty", value: "self_hostable" }],
    }),
  ];

  const broaderAi = [
    rationale({
      code:
        result.aiLane.posture === "not_now"
          ? "scale.ai_needs_foundations_first"
          : "scale.stack_supports_broader_ai_later",
      evidence: [{ field: "aiLane.posture", value: result.aiLane.posture }],
    }),
  ];

  const selfHostingMaturity = [
    rationale({
      code:
        result.readiness.opsCapability.label === "weak"
          ? "scale.start_managed_move_in_house_later"
          : "scale.can_take_more_in_house_over_time",
      evidence: [
        {
          field: "readiness.opsCapability",
          value: result.readiness.opsCapability.label,
        },
      ],
    }),
  ];

  return {
    currentSize,
    growth,
    moreDepartments,
    stricterGovernance,
    broaderAi,
    selfHostingMaturity,
  };
}

function nextSteps(result: EngineResult): PlanningReport["nextSteps"] {
  const immediate: RationaleItem[] = [];
  const within30Days: RationaleItem[] = [];
  const pilots: RationaleItem[] = [];
  const cautionFlags: RationaleItem[] = [];

  const phaseZero = result.sequencing.phases.find((phase) => phase.id === 0);
  for (const prerequisite of phaseZero?.prerequisites ?? []) {
    immediate.push(
      rationale({
        code: "next.address_prerequisite",
        params: { prerequisite: prerequisite.id },
        evidence: [{ field: "prerequisites", value: prerequisite.id }],
      }),
    );
  }

  const firstPhase = result.sequencing.phases.find(
    (phase) => phase.id === 1 && phase.migrations.length > 0,
  );
  if (firstPhase) {
    within30Days.push(
      rationale({
        code: "next.plan_first_phase",
        params: { count: firstPhase.migrations.length },
        evidence: [
          { field: "phases", value: firstPhase.migrations.map((m) => m.category) },
        ],
      }),
    );
  }

  within30Days.push(
    rationale({
      code: "next.verify_recommendations_against_current_releases",
      severity: "note",
      params: { rulepackVersion: result.rulepackVersion },
      evidence: [{ field: "rulepackVersion", value: result.rulepackVersion }],
    }),
  );

  for (const category of result.capacity.pilotsRecommended) {
    pilots.push(
      rationale({
        code: "next.run_pilot",
        params: { category },
        evidence: [{ field: "capacity.pilotsRecommended", value: category }],
      }),
    );
  }

  for (const recommendation of result.aiLane.recommendations.filter(
    (r) => r.timing === "pilot",
  )) {
    pilots.push(
      rationale({
        code: "next.pilot_ai_use_case",
        params: { useCase: recommendation.useCase.id },
        evidence: [{ field: "aiLane", value: recommendation.useCase.id }],
      }),
    );
  }

  cautionFlags.push(
    ...result.readiness.gaps.filter((gap) => gap.severity === "caution"),
  );
  cautionFlags.push(
    ...result.capacity.gaps.filter((gap) => gap.severity === "caution"),
  );

  return { immediate, within30Days, pilots, cautionFlags };
}

export type BuildReportOptions = {
  /** Injected rather than read from the clock, so the composer stays pure. */
  generatedAt: string;
};

export function buildReport(
  result: EngineResult,
  pack: Rulepack,
  options: BuildReportOptions,
): PlanningReport {
  const categoryById = new Map<CategoryId, Category>(
    pack.categories.map((category) => [category.id, category]),
  );

  const targetStack: PlanningReport["targetStack"] = result.recommendations.map(
    (recommendation) => {
      const entry = recommendation.entry;
      const name = currentToolName(result, recommendation.category, pack);

      return {
        category: recommendation.category,
        coverageDepth:
          categoryById.get(recommendation.category)?.coverageDepth ?? "full",
        currentTool: {
          kind: entry.currentTool.kind,
          ...(name ? { name } : {}),
        },
        seats: entry.seats,
        recommended: recommendation.primary ? candidate(recommendation.primary) : null,
        backups: recommendation.backups.map(candidate),
        ruledOut: recommendation.eliminated.map((eliminated) => ({
          tool: toolSummary(eliminated.tool),
          reason: eliminated.reason,
        })),
        notes: recommendation.notes,
      };
    },
  );

  const phases: PlanningReport["roadmap"]["phases"] = result.sequencing.phases.map(
    (phase) => {
      const capacity = result.capacity.perPhase.find((p) => p.phase === phase.id);

      return {
        id: phase.id,
        affectedSeats: phase.affectedSeats,
        effortDays: capacity?.days ?? { min: 0, max: 0 },
        prerequisites: phase.prerequisites.map((prerequisite) => ({
          id: prerequisite.id,
          label: prerequisite.label,
          description: prerequisite.description,
          kind: prerequisite.kind,
          effort: prerequisite.effort,
        })),
        migrations: phase.migrations.map((migration) => {
          const effort = capacity?.efforts.find(
            (e) => e.category === migration.category,
          );
          const tool = migration.recommendation.primary!.tool;

          return {
            category: migration.category,
            toolName: tool.name,
            seats: migration.seats,
            difficulty: {
              score: migration.difficulty.score,
              label: migration.difficulty.label,
              drivers: migration.difficulty.drivers,
            },
            effort: {
              band: effort?.band ?? "m",
              days: effort?.days ?? { min: 0, max: 0 },
            },
            gotchas: migration.difficulty.gotchas,
            coexistence: tool.coexistence,
            rollbackDifficulty: tool.rollbackDifficulty,
            pilotRecommended: effort?.pilotRecommended ?? false,
            externalSupportLikely: effort?.externalSupportLikely ?? false,
            reasons: migration.reasons,
          };
        }),
        notes: phase.notes,
      };
    },
  );

  const activePhases = phases.filter(
    (phase) => phase.migrations.length > 0 || phase.prerequisites.length > 0,
  ).length;

  const usedTools = result.recommendations
    .map((r) => r.primary?.tool)
    .filter((tool): tool is TargetTool => Boolean(tool));

  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    generatedAt: options.generatedAt,
    engineVersion: result.engineVersion,
    rulepackVersion: result.rulepackVersion,
    rulepackIsDraft: usedTools.some((tool) => tool.reviewStatus === "draft"),
    locale: result.assessment.input.locale,

    organization: {
      orgType: result.assessment.input.org.orgType,
      country: result.assessment.input.org.country,
      ...(result.assessment.input.org.region
        ? { region: result.assessment.input.org.region }
        : {}),
      totalSeats: result.assessment.input.org.totalSeats,
      sizeBucket: result.assessment.derived.sizeBucket,
      departments: result.assessment.input.org.departments,
      publicSector: result.assessment.derived.publicSectorProfile,
      germanLanguageRequired: result.assessment.input.org.germanLanguageRequired,
      hostingPreference: result.assessment.input.operating.hostingPreference,
    },

    atAGlance: {
      readiness: result.readiness.overall,
      migrationPosture: migrationPosture(result),
      savingsOutlook: result.savings.band,
      aiPosture: result.aiLane.posture,
      affectedSeats: phases.reduce((sum, phase) => sum + phase.affectedSeats, 0),
      activePhases,
    },

    readiness: {
      opsCapability: result.readiness.opsCapability,
      changeCapacity: result.readiness.changeCapacity,
      identityReadiness: result.readiness.identityReadiness,
      supportNeed: result.readiness.supportNeed,
      aiReadiness: result.readiness.aiReadiness,
      overall: result.readiness.overall,
      gaps: result.readiness.gaps,
    },

    targetStack,

    roadmap: {
      phases,
      keepForNow: result.sequencing.keepForNow.map((deferred) => {
        const name = currentToolName(result, deferred.category, pack);
        return {
          category: deferred.category,
          ...(name ? { currentToolName: name } : {}),
          reason: deferred.reason,
          revisitWhen: deferred.revisitWhen,
        };
      }),
    },

    capacity: {
      totalEffortDays: result.capacity.total,
      availablePerYear: result.capacity.availablePerYear,
      gaps: result.capacity.gaps,
      pilotsRecommended: result.capacity.pilotsRecommended,
      externalSupportFor: result.capacity.externalSupportFor,
    },

    savings: {
      band: result.savings.band,
      drivers: result.savings.drivers,
      offsets: result.savings.offsets,
      parallelRunPhases: result.savings.parallelRunPhases,
      modelLimitations: result.savings.modelLimitations,
    },

    advantages: advantages(result),

    aiLane: {
      posture: result.aiLane.posture,
      recommendations: result.aiLane.recommendations.map((recommendation) => ({
        useCaseId: recommendation.useCase.id,
        label: recommendation.useCase.label,
        description: recommendation.useCase.description,
        timing: recommendation.timing,
        deployment: recommendation.deployment
          ? {
              id: recommendation.deployment.id,
              label: recommendation.deployment.label,
              description: recommendation.deployment.description,
              posture: recommendation.deployment.posture,
              sovereignty: recommendation.deployment.sovereignty,
            }
          : null,
        humanReviewExpectation: recommendation.useCase.humanReviewExpectation,
        governanceNotes: recommendation.useCase.governanceNotes,
        reasons: recommendation.reasons,
        risks: recommendation.risks,
      })),
      notes: result.aiLane.notes,
    },

    scalability: scalability(result),
    nextSteps: nextSteps(result),

    method: {
      inputsUsed: [
        "org.orgType",
        "org.totalSeats",
        "org.departments",
        "org.publicSector",
        "org.germanLanguageRequired",
        "operating.hostingPreference",
        "operating.itMaturity",
        "operating.adminCapacity",
        "operating.identityMaturity",
        "operating.linuxCapability",
        "operating.supportExpectation",
        "stack.seats",
        "stack.criticality",
        "stack.pain",
        "stack.urgency",
        "stack.lockInConcern",
        "stack.trainingSensitivity",
        "ai.interest",
        "ai.dataSensitivity",
        "ai.deploymentPreference",
        "ai.hardwareProfile",
        "ai.useCases",
      ],
      // Stated plainly, because a planning tool that hides its blind spots is
      // more dangerous than one with fewer features.
      notModelled: [
        "method.not_modelled.licence_prices",
        "method.not_modelled.existing_contracts",
        "method.not_modelled.staff_skills_in_detail",
        "method.not_modelled.legal_retention_duties",
        "method.not_modelled.network_topology",
        "method.not_modelled.integrations_with_specialist_software",
      ],
      dataQualityNotes: result.assessment.notes,
      unassessedCategories: result.assessment.derived.unassessedCategories,
    },
  };
}
