import { z } from "zod";
import {
  AI_TIMINGS,
  CATEGORY_IDS,
  COVERAGE_DEPTHS,
  OUTLOOK_BANDS,
  PHASE_IDS,
  READINESS_LABELS,
  SIZE_BUCKETS,
} from "@/domain/enums";
import { rationaleItemSchema } from "@/domain/rationale";

/**
 * The planning report.
 *
 * A versioned, validated JSON document and the **only** contract between the
 * engine and every renderer — screen, Markdown, print, and later server-side
 * PDF. Renderers read this and nothing else; they never reach back into the
 * engine or the raw assessment.
 *
 * Everything here is plain JSON: no Maps, no class instances, no functions. It
 * has to survive serialization intact, because that is what makes a report
 * reproducible and what will let a PDF renderer consume it unchanged.
 *
 * Text is never stored here. Every human-readable string is produced by a
 * renderer from a code plus parameters, which is why the same document can be
 * rendered in German or English without the engine knowing either language.
 */

export const REPORT_SCHEMA_VERSION = 1;

const rationaleList = z.array(rationaleItemSchema);

const dayRangeSchema = z.object({
  min: z.number().int().min(0),
  max: z.number().int().min(0),
});

const bandSchema = z.object({
  score: z.number().min(0).max(100),
  label: z.enum(READINESS_LABELS),
  drivers: rationaleList,
});

const localizedTextSchema = z.object({
  de: z.string(),
  en: z.string().optional(),
});

/** A candidate as the report presents it, flattened from the rulepack entry. */
const toolSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  summary: localizedTextSchema,
  license: z.string(),
  vendorCountry: z.string().optional(),
  hostingModes: z.array(z.string()),
  sovereignty: z.number().int().min(1).max(5),
  maturity: z.number().int().min(1).max(5),
  supportModel: z.string(),
  scalabilityNotes: localizedTextSchema,
  comfortableUpTo: z.number().int(),
  /** Whether a human has verified this entry against its sources. */
  reviewStatus: z.enum(["draft", "verified"]),
  sources: z.array(z.string()),
});

const scoredCandidateSchema = z.object({
  tool: toolSummarySchema,
  score: z.number().min(0).max(100),
  fitReasons: rationaleList,
  cautions: rationaleList,
});

export const targetStackEntrySchema = z.object({
  category: z.enum(CATEGORY_IDS),
  coverageDepth: z.enum(COVERAGE_DEPTHS),
  currentTool: z.object({
    kind: z.enum(["known", "other", "none"]),
    name: z.string().optional(),
  }),
  seats: z.number().int(),
  recommended: scoredCandidateSchema.nullable(),
  backups: z.array(scoredCandidateSchema),
  /**
   * Candidates ruled out, each with the reason. Keeping these is what lets the
   * report show its work instead of asserting a winner.
   */
  ruledOut: z.array(z.object({ tool: toolSummarySchema, reason: rationaleItemSchema })),
  notes: rationaleList,
});

export const phaseSchema = z.object({
  id: z.union([
    z.literal(PHASE_IDS[0]),
    z.literal(PHASE_IDS[1]),
    z.literal(PHASE_IDS[2]),
    z.literal(PHASE_IDS[3]),
    z.literal(PHASE_IDS[4]),
  ]),
  affectedSeats: z.number().int().min(0),
  effortDays: dayRangeSchema,
  prerequisites: z.array(
    z.object({
      id: z.string(),
      label: localizedTextSchema,
      description: localizedTextSchema,
      kind: z.string(),
      effort: z.number().int().min(1).max(5),
    }),
  ),
  migrations: z.array(
    z.object({
      category: z.enum(CATEGORY_IDS),
      toolName: z.string(),
      seats: z.number().int(),
      difficulty: z.object({
        score: z.number(),
        label: z.string(),
        drivers: rationaleList,
      }),
      effort: z.object({ band: z.string(), days: dayRangeSchema }),
      /** Warnings specific to this move, not generic advice. */
      gotchas: z.array(z.string()),
      coexistence: z.string(),
      rollbackDifficulty: z.number().int().min(1).max(5),
      pilotRecommended: z.boolean(),
      externalSupportLikely: z.boolean(),
      reasons: rationaleList,
    }),
  ),
  notes: rationaleList,
});

export const planningReportSchema = z.object({
  schemaVersion: z.literal(REPORT_SCHEMA_VERSION),
  generatedAt: z.string(),
  engineVersion: z.string(),
  rulepackVersion: z.string(),
  /** True when any rule entry used is still unverified by a human. */
  rulepackIsDraft: z.boolean(),
  locale: z.enum(["de", "en"]),

  organization: z.object({
    orgType: z.string(),
    country: z.string(),
    region: z.string().optional(),
    totalSeats: z.number().int(),
    sizeBucket: z.enum(SIZE_BUCKETS),
    departments: z.array(z.string()),
    publicSector: z.boolean(),
    germanLanguageRequired: z.boolean(),
    hostingPreference: z.string(),
  }),

  /** The six figures that carry the at-a-glance summary. */
  atAGlance: z.object({
    readiness: bandSchema,
    migrationPosture: z.enum(["prepare_first", "start_selectively", "proceed"]),
    savingsOutlook: z.enum(OUTLOOK_BANDS),
    aiPosture: z.enum(["not_now", "start_small", "proceed"]),
    affectedSeats: z.number().int(),
    activePhases: z.number().int(),
  }),

  readiness: z.object({
    opsCapability: bandSchema,
    changeCapacity: bandSchema,
    identityReadiness: bandSchema,
    supportNeed: bandSchema,
    aiReadiness: bandSchema,
    overall: bandSchema,
    gaps: rationaleList,
  }),

  targetStack: z.array(targetStackEntrySchema),

  roadmap: z.object({
    phases: z.array(phaseSchema),
    /** Categories to keep for now, each with the condition to revisit it. */
    keepForNow: z.array(
      z.object({
        category: z.enum(CATEGORY_IDS),
        currentToolName: z.string().optional(),
        reason: rationaleItemSchema,
        revisitWhen: z.string(),
      }),
    ),
  }),

  capacity: z.object({
    totalEffortDays: dayRangeSchema,
    availablePerYear: dayRangeSchema,
    gaps: rationaleList,
    pilotsRecommended: z.array(z.enum(CATEGORY_IDS)),
    externalSupportFor: z.array(z.enum(CATEGORY_IDS)),
  }),

  savings: z.object({
    band: z.enum(OUTLOOK_BANDS),
    drivers: rationaleList,
    offsets: rationaleList,
    parallelRunPhases: z.number().int(),
    modelLimitations: rationaleList,
  }),

  advantages: rationaleList,

  aiLane: z.object({
    posture: z.enum(["not_now", "start_small", "proceed"]),
    recommendations: z.array(
      z.object({
        useCaseId: z.string(),
        label: localizedTextSchema,
        description: localizedTextSchema,
        timing: z.enum(AI_TIMINGS),
        deployment: z
          .object({
            id: z.string(),
            label: localizedTextSchema,
            description: localizedTextSchema,
            posture: z.string(),
            sovereignty: z.number().int().min(1).max(5),
          })
          .nullable(),
        humanReviewExpectation: z.string(),
        governanceNotes: localizedTextSchema,
        reasons: rationaleList,
        risks: rationaleList,
      }),
    ),
    notes: rationaleList,
  }),

  /** Whether the recommended stack still holds as the organization changes. */
  scalability: z.object({
    currentSize: rationaleList,
    growth: rationaleList,
    moreDepartments: rationaleList,
    stricterGovernance: rationaleList,
    broaderAi: rationaleList,
    selfHostingMaturity: rationaleList,
  }),

  nextSteps: z.object({
    immediate: rationaleList,
    within30Days: rationaleList,
    pilots: rationaleList,
    cautionFlags: rationaleList,
  }),

  /** What the engine used, and what it does not model. Never omitted. */
  method: z.object({
    inputsUsed: z.array(z.string()),
    notModelled: z.array(z.string()),
    dataQualityNotes: rationaleList,
    unassessedCategories: z.array(z.enum(CATEGORY_IDS)),
  }),
});

export type PlanningReport = z.infer<typeof planningReportSchema>;
export type TargetStackEntry = z.infer<typeof targetStackEntrySchema>;
export type ReportPhase = z.infer<typeof phaseSchema>;
export type ToolSummary = z.infer<typeof toolSummarySchema>;

export function parsePlanningReport(value: unknown): PlanningReport {
  return planningReportSchema.parse(value);
}
