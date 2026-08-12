import type { AiTiming, AiUseCaseId, Level } from "@/domain/enums";
import { rationale, type RationaleItem } from "@/domain/rationale";
import type { AiDeployment, AiUseCase, Rulepack } from "@/rulepack/schema";
import type { NormalizedAssessment } from "./normalize";
import type { ReadinessProfile } from "./readiness";
import type { Sequencing } from "./sequencing";

/**
 * Stage 8 — the local-AI lane.
 *
 * Answers which of the organization's stated AI ambitions are realistic now,
 * which deserve a pilot, and which should wait — each with a reason. "Not yet"
 * with an explanation is more useful than an encouraging answer that collapses
 * on contact with the hardware budget.
 */

export type AiRecommendation = {
  useCase: AiUseCase;
  timing: AiTiming;
  /** The posture that fits, given data sensitivity and available hardware. */
  deployment: AiDeployment | null;
  reasons: RationaleItem[];
  risks: RationaleItem[];
};

export type AiLane = {
  recommendations: AiRecommendation[];
  /** Overall posture, for the executive summary. */
  posture: "not_now" | "start_small" | "proceed";
  notes: RationaleItem[];
};

const HARDWARE_RANK = { none: 0, office_pcs: 1, server: 2, gpu_capable: 3 } as const;
const LEVEL_RANK: Record<Level, number> = { low: 0, medium: 1, high: 2 };

/**
 * Picks the deployment posture that both fits the hardware and can carry the
 * data. Preference order runs from most sovereign to least, so an organization
 * is never nudged toward sending content out when it need not.
 */
function chooseDeployment(
  useCase: AiUseCase,
  assessment: NormalizedAssessment,
  pack: Rulepack,
): AiDeployment | null {
  const { hardwareProfile, dataSensitivity, deploymentPreference } =
    assessment.input.ai;

  const viable = pack.aiDeployments.filter((deployment) => {
    const hardwareOk =
      HARDWARE_RANK[hardwareProfile] >= HARDWARE_RANK[deployment.minHardware];
    const sensitivityOk =
      LEVEL_RANK[dataSensitivity] <=
      LEVEL_RANK[useCase.maxDataSensitivityByDeployment[deployment.posture]];
    return hardwareOk && sensitivityOk;
  });

  if (viable.length === 0) return null;

  const preferred = viable.filter(
    (deployment) =>
      deploymentPreference === "undecided" ||
      deployment.posture === deploymentPreference,
  );

  const pool = preferred.length > 0 ? preferred : viable;
  return [...pool].sort((a, b) => b.sovereignty - a.sovereignty)[0] ?? null;
}

export function assessAiLane(
  assessment: NormalizedAssessment,
  readiness: ReadinessProfile,
  sequencing: Sequencing,
  pack: Rulepack,
): AiLane {
  const { ai } = assessment.input;
  const notes: RationaleItem[] = [];

  if (ai.interest === "none") {
    return {
      recommendations: [],
      posture: "not_now",
      notes: [
        rationale({
          code: "ai.no_interest_declared",
          evidence: [{ field: "ai.interest", value: ai.interest }],
        }),
      ],
    };
  }

  // Whether a document store will exist early enough to ask questions of.
  const contentSourcePlanned = sequencing.phases
    .filter((phase) => phase.id > 0 && phase.id < 4)
    .flatMap((phase) => phase.migrations)
    .some((migration) =>
      ["file_sharing", "dms_archive", "intranet_wiki"].includes(migration.category),
    );

  const recommendations: AiRecommendation[] = [];

  for (const id of ai.useCases as AiUseCaseId[]) {
    const useCase = pack.aiUseCases.find((candidate) => candidate.id === id);
    if (!useCase) continue;

    const reasons: RationaleItem[] = [];
    const risks: RationaleItem[] = [];
    const deployment = chooseDeployment(useCase, assessment, pack);

    let timing: AiTiming = "now";

    // Hardware is the hard constraint. Everything else is negotiable.
    if (HARDWARE_RANK[ai.hardwareProfile] < HARDWARE_RANK[useCase.minHardware]) {
      timing = "later";
      reasons.push(
        rationale({
          code: "ai.hardware_below_requirement",
          severity: "caution",
          params: { required: useCase.minHardware, available: ai.hardwareProfile },
          evidence: [{ field: "ai.hardwareProfile", value: ai.hardwareProfile }],
        }),
      );
    } else if (!deployment) {
      // Hardware is fine but no posture can carry data this sensitive.
      timing = "later";
      reasons.push(
        rationale({
          code: "ai.no_posture_carries_this_data",
          severity: "caution",
          params: { sensitivity: ai.dataSensitivity },
          evidence: [{ field: "ai.dataSensitivity", value: ai.dataSensitivity }],
        }),
      );
    }

    // Internal document Q&A has nothing to answer from until a document store
    // exists. This dependency is easy to miss and expensive to discover late.
    if (timing !== "later" && useCase.requiresContentSource && !contentSourcePlanned) {
      timing = "later";
      reasons.push(
        rationale({
          code: "ai.needs_a_document_store_first",
          severity: "caution",
          params: { useCase: useCase.id },
          evidence: [
            {
              field: "phases",
              value: "no file, wiki or document migration before phase 4",
            },
          ],
        }),
      );
    }

    if (timing === "now") {
      // Everything checks out technically, but readiness and caution still
      // argue for starting small rather than switching a whole authority on.
      if (readiness.aiReadiness.label === "weak" || ai.interest === "cautious") {
        timing = "pilot";
        reasons.push(
          rationale({
            code: "ai.start_with_a_pilot",
            params: { readiness: readiness.aiReadiness.label },
            evidence: [
              { field: "readiness.aiReadiness", value: readiness.aiReadiness.label },
              { field: "ai.interest", value: ai.interest },
            ],
          }),
        );
      } else if (useCase.humanReviewExpectation === "required") {
        timing = "pilot";
        reasons.push(
          rationale({
            code: "ai.review_process_needed_before_scale",
            params: { useCase: useCase.id },
            evidence: [
              {
                field: "useCase.humanReviewExpectation",
                value: useCase.humanReviewExpectation,
              },
            ],
          }),
        );
      } else {
        reasons.push(
          rationale({
            code: "ai.fits_today",
            evidence: [{ field: "ai.hardwareProfile", value: ai.hardwareProfile }],
          }),
        );
      }
    }

    risks.push(
      rationale({
        code: `ai.review_${useCase.humanReviewExpectation}`,
        severity: useCase.humanReviewExpectation === "required" ? "caution" : "note",
        params: { useCase: useCase.id },
        evidence: [
          {
            field: "useCase.humanReviewExpectation",
            value: useCase.humanReviewExpectation,
          },
        ],
      }),
    );

    if (
      ai.dataSensitivity === "high" &&
      deployment &&
      deployment.posture === "eu_hosted"
    ) {
      risks.push(
        rationale({
          code: "ai.sensitive_content_leaves_the_building",
          severity: "caution",
          evidence: [{ field: "ai.dataSensitivity", value: ai.dataSensitivity }],
        }),
      );
    }

    recommendations.push({ useCase, timing, deployment, reasons, risks });
  }

  const anyNow = recommendations.some((r) => r.timing === "now");
  const anyPilot = recommendations.some((r) => r.timing === "pilot");
  const posture: AiLane["posture"] = anyNow
    ? "proceed"
    : anyPilot
      ? "start_small"
      : "not_now";

  if (
    recommendations.length > 0 &&
    recommendations.every((r) => r.timing === "later")
  ) {
    notes.push(
      rationale({
        code: "ai.address_prerequisites_first",
        severity: "note",
        params: { count: recommendations.length },
        evidence: [{ field: "ai.useCases", value: ai.useCases }],
      }),
    );
  }

  return { recommendations, posture, notes };
}
