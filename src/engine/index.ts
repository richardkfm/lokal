import { assessAiLane } from "./ai-lane";
import { selectStack } from "./candidates";
import { assessCapacity } from "./capacity";
import { assessDifficulty } from "./difficulty";
import { normalize } from "./normalize";
import { assessReadiness } from "./readiness";
import { assessSavings } from "./savings";
import { sequence } from "./sequencing";
import type { CategoryId } from "@/domain/enums";
import type { AssessmentInput } from "@/domain/intake";
import type { Rulepack } from "@/rulepack/schema";
import type { AiLane } from "./ai-lane";
import type { CategoryRecommendation } from "./candidates";
import type { CapacityAssessment } from "./capacity";
import type { MigrationDifficulty } from "./difficulty";
import type { NormalizedAssessment } from "./normalize";
import type { ReadinessProfile } from "./readiness";
import type { SavingsOutlook } from "./savings";
import type { Sequencing } from "./sequencing";

export * from "./ai-lane";
export * from "./candidates";
export * from "./capacity";
export * from "./difficulty";
export * from "./normalize";
export * from "./readiness";
export * from "./savings";
export * from "./sequencing";
export * from "./weights";

/**
 * The engine version, independent of the rulepack version.
 *
 * A change here means the same answers and the same rules could now produce a
 * different plan, so reports record it alongside the rulepack version.
 */
export const ENGINE_VERSION = "1.0.0";

export type EngineResult = {
  engineVersion: string;
  rulepackVersion: string;
  assessment: NormalizedAssessment;
  readiness: ReadinessProfile;
  recommendations: CategoryRecommendation[];
  difficulties: Map<CategoryId, MigrationDifficulty>;
  sequencing: Sequencing;
  capacity: CapacityAssessment;
  savings: SavingsOutlook;
  aiLane: AiLane;
};

/**
 * Runs every stage in order.
 *
 * Pure: the same input and the same rulepack always produce the same result.
 * No database, no network, no clock, no language model. That is what makes a
 * report reproducible, comparable across months, and arguable — a reader can
 * dispute a rule rather than a black box.
 */
export function runEngine(input: AssessmentInput, pack: Rulepack): EngineResult {
  const assessment = normalize(input);
  const readiness = assessReadiness(assessment);
  const recommendations = selectStack(assessment, readiness, pack);

  const difficulties = new Map<CategoryId, MigrationDifficulty>(
    recommendations.map((recommendation) => [
      recommendation.category,
      assessDifficulty(recommendation, assessment, readiness, pack),
    ]),
  );

  const sequencing = sequence(
    recommendations,
    difficulties,
    assessment,
    readiness,
    pack,
  );
  const capacity = assessCapacity(sequencing, assessment, readiness);
  const savings = assessSavings(assessment, sequencing, capacity, pack);
  const aiLane = assessAiLane(assessment, readiness, sequencing, pack);

  return {
    engineVersion: ENGINE_VERSION,
    rulepackVersion: pack.version,
    assessment,
    readiness,
    recommendations,
    difficulties,
    sequencing,
    capacity,
    savings,
    aiLane,
  };
}
