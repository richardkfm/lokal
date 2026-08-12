import { z } from "zod";
import {
  AI_DEPLOYMENTS,
  AI_INTERESTS,
  AI_USE_CASE_IDS,
  CATEGORY_IDS,
  COUNTRIES,
  GERMAN_REGIONS,
  HARDWARE_PROFILES,
  HOSTING_PREFERENCES,
  LEVELS,
  LINUX_CAPABILITIES,
  ORG_TYPES,
  SUPPORT_EXPECTATIONS,
  URGENCIES,
} from "./enums";

/**
 * What the intake wizard collects.
 *
 * Types are inferred from these schemas rather than declared alongside them, so
 * validation and types cannot drift apart. Everything the engine consumes passes
 * through here first.
 */

/** Bumped whenever a stored payload would no longer parse. */
export const INTAKE_SCHEMA_VERSION = 1;

/** Seat counts are per-category as well as organization-wide; both matter. */
const seatCount = z
  .number()
  .int("Seat counts must be whole numbers.")
  .min(1, "At least one seat is required.")
  .max(500_000, "Seat counts above 500,000 are outside what lokal models.");

const level = z.enum(LEVELS);

export const orgProfileSchema = z.object({
  orgType: z.enum(ORG_TYPES),
  country: z.enum(COUNTRIES),
  /** German state. Context only in v0.1.0; no rule depends on it yet. */
  region: z.enum(GERMAN_REGIONS).optional(),
  totalSeats: seatCount,
  /**
   * Free-text department names. They are not matched against anything; their
   * count and spread drive change-management weighting.
   */
  departments: z
    .array(z.string().trim().min(1).max(60))
    .max(40, "More than 40 departments is beyond what this model distinguishes.")
    .default([]),
  /**
   * Explicit public-sector context. Some organization types imply it, but an
   * association running a public mandate may tick it too.
   */
  publicSector: z.boolean(),
  germanLanguageRequired: z.boolean(),
});

export const operatingModelSchema = z.object({
  hostingPreference: z.enum(HOSTING_PREFERENCES),
  itMaturity: level,
  adminCapacity: level,
  identityMaturity: level,
  linuxCapability: z.enum(LINUX_CAPABILITIES),
  supportExpectation: z.enum(SUPPORT_EXPECTATIONS),
});

/**
 * Which tool currently occupies a category.
 *
 * Modelled as a tagged union rather than a string with reserved sentinel values,
 * so "we use something the catalog does not know" and "we have nothing here" are
 * distinguishable states the engine can reason about.
 */
export const currentToolSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("known"), id: z.string().trim().min(1) }),
  z.object({ kind: z.literal("other"), label: z.string().trim().min(1).max(80) }),
  z.object({ kind: z.literal("none") }),
]);

export const stackEntrySchema = z.object({
  category: z.enum(CATEGORY_IDS),
  currentTool: currentToolSchema,
  /** Seats affected in this category, which often differs from the whole org. */
  seats: seatCount,
  criticality: level,
  pain: level,
  urgency: z.enum(URGENCIES),
  lockInConcern: level,
  trainingSensitivity: level,
  notes: z.string().trim().max(500).optional(),
});

export const aiPostureSchema = z.object({
  interest: z.enum(AI_INTERESTS),
  dataSensitivity: level,
  deploymentPreference: z.enum(AI_DEPLOYMENTS),
  hardwareProfile: z.enum(HARDWARE_PROFILES),
  useCases: z.array(z.enum(AI_USE_CASE_IDS)).default([]),
});

export const assessmentInputSchema = z.object({
  schemaVersion: z.literal(INTAKE_SCHEMA_VERSION),
  locale: z.enum(["de", "en"]),
  org: orgProfileSchema,
  operating: operatingModelSchema,
  /**
   * Only the categories the organization actually assessed. A missing category
   * is reported as "not assessed", never as "nothing to do" — silence is not a
   * finding.
   */
  stack: z
    .array(stackEntrySchema)
    .min(1, "Assess at least one category.")
    .refine(
      (entries) => new Set(entries.map((e) => e.category)).size === entries.length,
      { message: "Each category may only be assessed once." },
    ),
  ai: aiPostureSchema,
});

export type OrgProfile = z.infer<typeof orgProfileSchema>;
export type OperatingModel = z.infer<typeof operatingModelSchema>;
export type CurrentTool = z.infer<typeof currentToolSchema>;
export type StackEntry = z.infer<typeof stackEntrySchema>;
export type AiPosture = z.infer<typeof aiPostureSchema>;
export type AssessmentInput = z.infer<typeof assessmentInputSchema>;

/** Parses unknown input, throwing on failure. Use at trust boundaries. */
export function parseAssessmentInput(value: unknown): AssessmentInput {
  return assessmentInputSchema.parse(value);
}
