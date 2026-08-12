import { z } from "zod";
import {
  AI_USE_CASE_IDS,
  CATEGORY_IDS,
  COEXISTENCE,
  COVERAGE_DEPTHS,
  HARDWARE_PROFILES,
  HOSTING_MODES,
  LEVELS,
  LICENSES,
  ORG_TYPES,
  SUPPORT_MODELS,
} from "@/domain/enums";
import type { AssessmentInput, StackEntry } from "@/domain/intake";

/**
 * The shape of a rulepack.
 *
 * Rules live in TypeScript source rather than database seeds: they are
 * type-checked, reviewable in a diff, and testable. Prisma's only job in lokal is
 * storing what users answered.
 *
 * Every claim about a real product carries `sources` and `lastReviewed`. Wrong
 * claims about Nextcloud or Zammad destroy trust with exactly the audience lokal
 * targets, so an unsourced entry does not parse.
 */

/**
 * German is authored first. `en` may be absent while English content is being
 * written; renderers fall back to `de` and the report says which fields are not
 * yet translated. Coverage is enforced for UI strings (message catalogs), not for
 * rule prose, so that a missing translation never blocks a correct German plan.
 */
export const localizedTextSchema = z.object({
  de: z.string().trim().min(1),
  en: z.string().trim().min(1).optional(),
});
export type LocalizedText = z.infer<typeof localizedTextSchema>;

const score5 = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

const identifier = z
  .string()
  .regex(/^[a-z0-9]+(?:[_-][a-z0-9]+)*$/, "Identifiers are lowercase and hyphenated.");

/** ISO date (YYYY-MM-DD) on which a human last checked the entry against reality. */
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use an ISO date, e.g. 2026-08-12.")
  .refine((value) => !Number.isNaN(Date.parse(value)), "Not a real date.");

/** At least one citation a reviewer can actually follow. */
const sources = z
  .array(z.url())
  .min(1, "Every rulepack entry needs at least one source a reviewer can check.");

/**
 * Whether a human has verified this entry against its sources.
 *
 * `draft` entries were authored from general knowledge and cite official
 * documentation a reviewer can follow, but nobody has yet confirmed the ratings
 * against the current release. The report states this prominently. A planning tool
 * that quietly presents unverified ratings as researched fact is exactly the
 * failure mode lokal exists to avoid.
 */
const reviewStatus = z.enum(["draft", "verified"]);

const provenance = {
  lastReviewed: isoDate,
  reviewStatus,
  sources,
};

export const categorySchema = z.object({
  id: z.enum(CATEGORY_IDS),
  label: localizedTextSchema,
  description: localizedTextSchema,
  /**
   * `focused` marks a category researched more narrowly than the rest. The report
   * states this rather than implying equal depth across all nine categories.
   */
  coverageDepth: z.enum(COVERAGE_DEPTHS),
  /**
   * Prerequisites that migrating this category satisfies.
   *
   * Without this, a plan can schedule Nextcloud Talk in phase 1 while the
   * Nextcloud it runs on arrives in phase 3 — internally consistent on paper
   * and impossible in practice.
   */
  provides: z.array(identifier).default([]),
  /** Ordering hint for the report's target-stack section. */
  displayOrder: z.number().int().min(0),
});
export type Category = z.infer<typeof categorySchema>;

export const sourceToolSchema = z.object({
  id: identifier,
  category: z.enum(CATEGORY_IDS),
  name: z.string().min(1),
  /** How hard this product makes it to leave: formats, contracts, integrations. */
  vendorLockIn: score5,
  /** How usable an export actually is once you have it. */
  dataExportQuality: score5,
  /** Drives sensible defaults in the wizard, nothing more. */
  commonIn: z.array(z.enum(ORG_TYPES)).default([]),
  ...provenance,
});
export type SourceTool = z.infer<typeof sourceToolSchema>;

export const prerequisiteSchema = z.object({
  id: identifier,
  label: localizedTextSchema,
  description: localizedTextSchema,
  kind: z.enum(["identity", "storage", "network", "process", "skill"]),
  effort: score5,
});
export type Prerequisite = z.infer<typeof prerequisiteSchema>;

export const targetToolSchema = z.object({
  id: identifier,
  category: z.enum(CATEGORY_IDS),
  name: z.string().min(1),
  summary: localizedTextSchema,
  license: z.enum(LICENSES),
  /** Where the primary vendor or foundation sits, when there is one. */
  vendorCountry: z.string().length(2).optional(),
  /**
   * Products that work notably better together. The engine gives a bounded bonus
   * to candidates sharing an ecosystem already chosen elsewhere, so the resulting
   * stack is coherent rather than nine locally optimal picks.
   */
  ecosystem: identifier.optional(),

  hostingModes: z.array(z.enum(HOSTING_MODES)).min(1),
  /** Data-location and exit control: how genuinely you can leave and self-host. */
  sovereignty: score5,
  /** Release cadence, install base, longevity. Not popularity. */
  maturity: score5,
  supportModel: z.enum(SUPPORT_MODELS),
  /** Availability of German integrators and hosting partners. */
  deMarketPresence: score5,
  /** German UI, documentation and support language. */
  germanUiQuality: score5,
  /** Track record in German public bodies specifically. */
  publicSectorFit: score5,

  /** Ongoing admin burden once it is running, not the install effort. */
  selfHostOpsLoad: score5,
  migrationComplexityBase: score5,
  trainingLoad: score5,
  seatScalability: z.object({
    comfortableUpTo: z.number().int().min(1),
    notes: localizedTextSchema,
  }),
  /** Whether it can run alongside the incumbent during a migration. */
  coexistence: z.enum(COEXISTENCE),
  rollbackDifficulty: score5,

  aiSuitability: z.object({
    hasNativeAi: z.boolean(),
    /** How well it accommodates a self-hosted or EU-hosted model. */
    localAiFriendly: score5,
    notes: localizedTextSchema.optional(),
  }),

  prerequisites: z.array(identifier).default([]),
  ...provenance,
});
export type TargetTool = z.infer<typeof targetToolSchema>;

/**
 * Specifics of moving from one product to another. `from: "*"` states what is
 * true of any move into this target.
 */
export const migrationEdgeSchema = z.object({
  from: z.union([identifier, z.literal("*")]),
  to: identifier,
  /** Adjusts the target's base complexity for this particular origin. */
  complexityDelta: z.union([
    z.literal(-2),
    z.literal(-1),
    z.literal(0),
    z.literal(1),
    z.literal(2),
  ]),
  dataMigration: z.object({
    effort: score5,
    toolingExists: z.boolean(),
    notes: localizedTextSchema,
  }),
  coexistenceNotes: localizedTextSchema.optional(),
  /** Message codes for the traps that catch people on this specific move. */
  gotchas: z.array(z.string().min(1)).default([]),
  ...provenance,
});
export type MigrationEdge = z.infer<typeof migrationEdgeSchema>;

export const aiUseCaseSchema = z.object({
  id: z.enum(AI_USE_CASE_IDS),
  label: localizedTextSchema,
  description: localizedTextSchema,
  /** The weakest hardware on which this is honestly usable. */
  minHardware: z.enum(HARDWARE_PROFILES),
  /** The most sensitive data this use case can responsibly touch per posture. */
  maxDataSensitivityByDeployment: z.object({
    local_device: z.enum(LEVELS),
    on_prem: z.enum(LEVELS),
    eu_hosted: z.enum(LEVELS),
  }),
  humanReviewExpectation: z.enum(["optional", "recommended", "required"]),
  governanceNotes: localizedTextSchema,
  /** Typical value delivered when it does fit. */
  typicalValue: score5,
  /**
   * Whether the use case needs an existing body of documents. Internal document
   * Q&A has nothing to answer from until a document store exists — a dependency
   * that is easy to miss and expensive to discover late.
   */
  requiresContentSource: z.boolean(),
  ...provenance,
});
export type AiUseCase = z.infer<typeof aiUseCaseSchema>;

export const aiDeploymentSchema = z.object({
  id: identifier,
  label: localizedTextSchema,
  description: localizedTextSchema,
  posture: z.enum(["local_device", "on_prem", "eu_hosted"]),
  minHardware: z.enum(HARDWARE_PROFILES),
  sovereignty: score5,
  opsLoad: score5,
  ...provenance,
});
export type AiDeployment = z.infer<typeof aiDeploymentSchema>;

/**
 * Context a blocker rule may inspect.
 *
 * The plan called for a serializable predicate DSL. Because rules ship as
 * TypeScript source rather than database rows, nothing needs serializing — a
 * typed predicate is simpler, fully type-checked, and avoids maintaining an
 * interpreter. The report still explains a blocker through its message code, so
 * inspectability is unaffected.
 */
export type BlockerContext = {
  input: AssessmentInput;
  entry: StackEntry;
  target: TargetTool;
};

export const blockerRuleSchema = z.object({
  id: identifier,
  /** Stable message code explaining the rule to the reader. */
  message: z.string().min(1),
  severity: z.enum(["caution", "blocker"]),
  when: z.custom<(context: BlockerContext) => boolean>(
    (value) => typeof value === "function",
    "A blocker rule needs a predicate function.",
  ),
});
export type BlockerRule = z.infer<typeof blockerRuleSchema>;

export const rulepackSchema = z.object({
  /** Date-based and immutable once released, e.g. "v2026-08". */
  version: z.string().regex(/^v\d{4}-\d{2}$/, 'Use a date version, e.g. "v2026-08".'),
  categories: z.array(categorySchema).min(1),
  sourceTools: z.array(sourceToolSchema),
  targetTools: z.array(targetToolSchema),
  migrationEdges: z.array(migrationEdgeSchema),
  prerequisites: z.array(prerequisiteSchema),
  aiUseCases: z.array(aiUseCaseSchema),
  aiDeployments: z.array(aiDeploymentSchema),
  blockerRules: z.array(blockerRuleSchema),
});
export type Rulepack = z.infer<typeof rulepackSchema>;
