import { z } from "zod";
import {
  AI_TIMINGS,
  CATEGORY_IDS,
  CLIENT_OS_VERDICTS,
  COVERAGE_DEPTHS,
  OUTLOOK_BANDS,
  PHASE_IDS,
  READINESS_LABELS,
  SIZE_BUCKETS,
  WORK_PACKAGES,
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

const phaseIdSchema = z.union([
  z.literal(PHASE_IDS[0]),
  z.literal(PHASE_IDS[1]),
  z.literal(PHASE_IDS[2]),
  z.literal(PHASE_IDS[3]),
  z.literal(PHASE_IDS[4]),
]);

/**
 * A phase in elapsed time.
 *
 * `startMonth`/`endMonth` are one timeline, for drawing the phase as a bar;
 * `months` is that phase's range. The two do not reconcile and cannot — a bar
 * needs a single line and an estimate has width. Renderers draw from the
 * timeline and quote from the range, never the other way round.
 */
const phaseDurationSchema = z.object({
  startMonth: z.number().int().min(0),
  endMonth: z.number().int().min(0),
  months: dayRangeSchema,
  /** True where people, not administrator time, set how long this takes. */
  floorBinds: z.boolean(),
  notes: rationaleList,
});

export const phaseSchema = z.object({
  id: phaseIdSchema,
  affectedSeats: z.number().int().min(0),
  effortDays: dayRangeSchema,
  duration: phaseDurationSchema,
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
      effort: z.object({
        band: z.string(),
        days: dayRangeSchema,
        /**
         * What the range is made of. The items sum exactly to `days` — the
         * breakdown explains the number and never changes it.
         */
        items: z.array(
          z.object({
            package: z.enum(WORK_PACKAGES),
            days: dayRangeSchema,
            reasons: rationaleList,
          }),
        ),
      }),
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

/**
 * One line of the price audit trail: which subscription, at which published
 * plan and price, counted at how many seats, covering which assessed categories.
 *
 * This exists so that a reader can check the figure rather than trust it. Every
 * number in the savings section traces back to one of these lines, and every
 * line names a page they can open.
 */
export const priceBasisSchema = z.object({
  toolId: z.string().min(1),
  toolName: z.string().min(1),
  planName: z.string().min(1),
  amountCents: z.number().int().min(0),
  billingTerm: z.enum(["annual_commitment", "monthly_flexible"]),
  taxBasis: z.enum(["net", "gross"]),
  observedOn: z.string().min(1),
  source: z.url(),
  seats: z.number().int().min(0),
  annualCents: z.number().int().min(0),
  categories: z.array(z.enum(CATEGORY_IDS)),
  remainingCategories: z.array(z.enum(CATEGORY_IDS)),
  fallsAway: z.boolean(),
});

/**
 * One side of the cost figure: days at a declared rate.
 *
 * `rateCents` travels with the amount because ADR-0004 guardrail 2 requires the
 * basis to be visible — "18–35 Tage × 480 €/Tag (von Ihnen angegeben)", never a
 * bare sum.
 */
export const costLineSchema = z.object({
  days: dayRangeSchema,
  rateCents: z.number().int().positive(),
  cents: dayRangeSchema,
});

export const subscriptionExposureSchema = z.object({
  currency: z.literal("EUR"),
  annualCents: z.number().int().min(0),
  avoidedAnnualCents: z.number().int().min(0),
  seatsPriced: z.number().int().min(0),
  /** Coverage, rendered every time so a partial sum is never read as a total. */
  categoriesPriced: z.number().int().min(0),
  categoriesAssessed: z.number().int().min(0),
  basis: z.array(priceBasisSchema),
  notes: rationaleList,
});

/**
 * Section 0 — the page a decision-maker reads.
 *
 * A *view* over slices that already exist, deriving no new judgement of its own.
 * That is the constraint that keeps it honest: if §0 could reach a different
 * conclusion from §5, the document would be arguing with itself, and the first
 * reader to notice would stop trusting both.
 *
 * It exists because the report was nine sections at identical weight opening
 * with Zusammenfassung and Vorteile, and an IT lead had nowhere to point a
 * Bürgermeister or a Geschäftsführung. This is that page.
 */
export const decisionBriefSchema = z.object({
  /** What is being decided: posture, what moves, what stays. */
  migrationsPlanned: z.number().int().min(0),
  categoriesKept: z.number().int().min(0),
  /**
   * Seats summed across the areas the plan touches. **Not a headcount**: one
   * person working in several areas counts several times, which is why the
   * at-a-glance tile carries a sentence saying so and why this must never be
   * rendered as "X von Y Arbeitsplätzen". The name says `Summed` so the next
   * renderer has to notice.
   */
  affectedSeatsSummed: z.number().int().min(0),
  /** The three highest-severity findings already stated elsewhere. */
  topRisks: rationaleList,
  /**
   * What the leadership has to supply for any of this to happen. Derived from
   * the capacity gap and the cost figure — never an ask lokal invented.
   */
  asks: rationaleList,
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

  /** Section 0: the page handed to whoever decides. Derived, never re-derived. */
  decisionBrief: decisionBriefSchema,

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

  /** The plan in elapsed time, which the day figures alone never answered. */
  schedule: z.object({
    horizonMonths: dayRangeSchema,
    /**
     * True when the plan needs more effort than the organization has in a year,
     * so the horizon restates the capacity gap rather than proposing dates. The
     * document leads with the gap in that case, not with the month figure.
     */
    exceedsCapacity: z.boolean(),
    notes: rationaleList,
  }),

  /**
   * The client operating system: whether the desktop can move, when, and what
   * blocks it. Never which distribution — that is deferred, and there is nowhere
   * in this shape to put one.
   */
  clientOs: z.object({
    verdict: z.enum(CLIENT_OS_VERDICTS),
    phase: phaseIdSchema.nullable(),
    gates: z.array(
      z.object({
        id: z.string(),
        label: localizedTextSchema,
        description: localizedTextSchema,
        status: z.enum(["met", "open", "manual"]),
      }),
    ),
    devices: z
      .object({
        count: z.number().int().min(0),
        /** `seats` means no device count was given and the report says so. */
        source: z.enum(["declared", "seats"]),
      })
      .nullable(),
    effortDays: dayRangeSchema.nullable(),
    blockers: rationaleList,
    cautions: rationaleList,
    reasons: rationaleList,
  }),

  /**
   * What the migration costs, from rates the organization declared (ADR-0004).
   *
   * Null lines are the ordinary case and mean no rate was given: the renderer
   * shows nothing rather than a zero. This figure and `savings.subscriptionExposure`
   * are never subtracted from one another, and `notes` carries the code that
   * says so wherever both appear.
   */
  cost: z.object({
    currency: z.literal("EUR"),
    internal: costLineSchema.nullable(),
    external: costLineSchema.nullable(),
    totalCents: dayRangeSchema.nullable(),
    coverage: z.object({
      migrationsPriced: z.number().int().min(0),
      migrationsTotal: z.number().int().min(0),
      externalSupportMigrations: z.number().int().min(0),
      includesClientOs: z.boolean(),
    }),
    notes: rationaleList,
  }),

  savings: z.object({
    band: z.enum(OUTLOOK_BANDS),
    drivers: rationaleList,
    offsets: rationaleList,
    parallelRunPhases: z.number().int(),
    modelLimitations: rationaleList,
    /**
     * Today's priced subscription exposure, or `null` when nothing in the stack
     * carries a citable published price (ADR-0003).
     *
     * Amounts are integers in minor units with a currency code. Renderers format
     * them; the document never carries formatted money, because a formatted
     * amount is one that has been separated from the plan name, source and
     * observation date that make it checkable.
     */
    subscriptionExposure: subscriptionExposureSchema.nullable(),
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

export type CostLine = z.infer<typeof costLineSchema>;
export type DecisionBrief = z.infer<typeof decisionBriefSchema>;
export type PhaseDuration = z.infer<typeof phaseDurationSchema>;
export type PriceBasis = z.infer<typeof priceBasisSchema>;
export type SubscriptionExposure = z.infer<typeof subscriptionExposureSchema>;
export type PlanningReport = z.infer<typeof planningReportSchema>;
export type TargetStackEntry = z.infer<typeof targetStackEntrySchema>;
export type ReportPhase = z.infer<typeof phaseSchema>;
export type ToolSummary = z.infer<typeof toolSummarySchema>;

export function parsePlanningReport(value: unknown): PlanningReport {
  return planningReportSchema.parse(value);
}
