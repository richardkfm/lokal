import { nanoid } from "nanoid";
import { assessmentInputSchema, type AssessmentInput } from "@/domain/intake";
import { runEngine } from "@/engine";
import { buildReport } from "@/report/build-report";
import { CURRENT_RULEPACK_VERSION, getRulepack, hasRulepack } from "@/rulepack";
import { db } from "./db";
import type { PlanningReport } from "@/report/schema";

/**
 * Storing and reconstituting assessments.
 *
 * Only the answers are stored. The report is recomputed on every render from
 * those answers plus the rulepack, so it can never drift out of step with the
 * rules it claims to be based on.
 */

/** Long enough that report links are not discoverable by guessing. */
const ID_LENGTH = 21;

export async function saveAssessment(input: AssessmentInput): Promise<string> {
  const validated = assessmentInputSchema.parse(input);
  const id = nanoid(ID_LENGTH);

  await db.assessment.create({
    data: {
      id,
      locale: validated.locale,
      rulepackVersion: CURRENT_RULEPACK_VERSION,
      schemaVersion: validated.schemaVersion,
      payload: validated,
      orgTypeHint: validated.org.orgType,
      seatsHint: validated.org.totalSeats,
    },
  });

  return id;
}

export type LoadedReport = {
  id: string;
  report: PlanningReport;
  /**
   * True when the assessment was taken against a rulepack that no longer
   * exists, so the plan was regenerated with current rules. The report says so
   * rather than quietly presenting different recommendations than last time.
   */
  rulesChangedSinceAssessment: boolean;
  assessmentRulepackVersion: string;
};

export async function loadReport(id: string): Promise<LoadedReport | null> {
  const record = await db.assessment.findUnique({ where: { id } });
  if (!record) return null;

  const input = assessmentInputSchema.parse(record.payload);

  const available = hasRulepack(record.rulepackVersion);
  const pack = getRulepack(
    available ? record.rulepackVersion : CURRENT_RULEPACK_VERSION,
  );

  const report = buildReport(runEngine(input, pack), pack, {
    generatedAt: record.createdAt.toISOString(),
  });

  return {
    id: record.id,
    report,
    rulesChangedSinceAssessment: !available,
    assessmentRulepackVersion: record.rulepackVersion,
  };
}
