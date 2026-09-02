"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { z } from "zod";
import {
  INTAKE_SCHEMA_VERSION,
  aiPostureSchema,
  assessmentInputSchema,
  operatingModelSchema,
  orgProfileSchema,
  ratesSchema,
  stackEntrySchema,
  workplaceSchema,
} from "@/domain/intake";
import type { AssessmentInput, StackEntry } from "@/domain/intake";
import { CATEGORY_IDS } from "@/domain/enums";
import type { CategoryId } from "@/domain/enums";

/**
 * Wizard state.
 *
 * The whole intake lives in one draft object in the browser. Nothing is sent to
 * the server until the final submit: there is no account, no session and no
 * partial-save endpoint, so a half-finished assessment never leaves the machine
 * it was typed on.
 *
 * The draft autosaves to localStorage, because losing fifteen minutes of
 * answers to a stray refresh is the fastest way to lose a user for good.
 */

export const STEPS = [
  "organization",
  "operating",
  "stack",
  "detail",
  "ai",
  "review",
] as const;
export type StepId = (typeof STEPS)[number];

const STORAGE_KEY = "lokal.assessment.draft.v1";

/** A draft is an assessment under construction: every part may be incomplete. */
export type Draft = {
  org: Partial<AssessmentInput["org"]>;
  operating: Partial<AssessmentInput["operating"]>;
  workplace: Partial<AssessmentInput["workplace"]>;
  /**
   * Both rates are optional in the schema, so an empty draft is already valid
   * here. That is the point: no rate declared means the report states no cost
   * figure at all rather than a plausible one (ADR-0004).
   */
  rates: Partial<AssessmentInput["rates"]>;
  /** Keyed by category so toggling one off and on again keeps its answers. */
  stack: Partial<Record<CategoryId, Partial<StackEntry>>>;
  selectedCategories: CategoryId[];
  ai: Partial<AssessmentInput["ai"]>;
};

export function emptyDraft(): Draft {
  return {
    org: {
      country: "DE",
      departments: [],
      publicSector: false,
      germanLanguageRequired: true,
    },
    operating: {},
    workplace: {},
    rates: {},
    stack: {},
    selectedCategories: [],
    ai: { useCases: [] },
  };
}

/** Per-step validation, so a step only reports on its own fields. */
const STEP_SCHEMAS: Record<StepId, z.ZodType | null> = {
  organization: orgProfileSchema,
  // Step 2 carries three blocks — how the team runs servers, what runs on the
  // desks, and what a day costs — merged flat rather than nested. Their field
  // names are disjoint, and a flat shape keeps every issue path a bare field
  // name, which is what the step's `error={issues.<field>}` wiring reads.
  operating: operatingModelSchema
    .extend(workplaceSchema.shape)
    .extend(ratesSchema.shape),
  stack: z.array(z.string()).min(1),
  detail: z.array(stackEntrySchema).min(1),
  ai: aiPostureSchema,
  review: null,
};

export type StepIssues = Record<string, string>;

/**
 * The stack entries a draft describes.
 *
 * `currentTool` defaults to "nothing in use", which is also what the detail
 * step's select rests on, so an untouched category means the same thing as one
 * the respondent deliberately left at "Nichts im Einsatz". Without the default
 * the step silently refuses to advance: the entry fails validation on a field
 * that has nowhere to show an error.
 *
 * `seats` falls back to the organization's total seat count. Most categories
 * affect everyone, so retyping the same number per category is pure friction;
 * the fallback is live (read here, not written into the draft), so it tracks
 * `org.totalSeats` if that changes later, and typing an explicit value for a
 * category overrides it from then on.
 */
export function stackEntries(draft: Draft) {
  return draft.selectedCategories.map((category) => ({
    currentTool: { kind: "none" as const },
    seats: draft.org.totalSeats,
    ...draft.stack[category],
    category,
  }));
}

/** Fields carried over when one category's ratings are applied to another. */
const COPYABLE_ENTRY_FIELDS = [
  "seats",
  "criticality",
  "pain",
  "urgency",
  "lockInConcern",
  "trainingSensitivity",
] as const;

/**
 * Lifts the rated fields out of one entry so they can be applied to another.
 *
 * `currentTool` and `notes` are excluded: those describe the tool itself, not
 * a judgment call likely to repeat across categories.
 */
export function copyEntryValues(
  source: Partial<StackEntry> | undefined,
): Partial<StackEntry> {
  const patch: Partial<StackEntry> = {};
  for (const field of COPYABLE_ENTRY_FIELDS) {
    const value = source?.[field];
    if (value !== undefined) {
      (patch as Record<string, unknown>)[field] = value;
    }
  }
  return patch;
}

/**
 * Applies the categories chosen on the stack step.
 *
 * A newly selected category starts empty. Every rating in it is a judgment call
 * this tool exists to surface, and the reasoning that once applied to
 * `lockInConcern` and `trainingSensitivity` applies to the other three as well.
 */
export function selectCategories(draft: Draft, values: string[]): Draft {
  const selectedCategories = CATEGORY_IDS.filter((id) => values.includes(id));
  const stack = { ...draft.stack };

  for (const category of selectedCategories) {
    const isNew = !draft.selectedCategories.includes(category);
    // Nothing is pre-filled.
    //
    // A newly ticked category used to arrive with criticality, Leidensdruck and
    // Dringlichkeit already chosen — visually indistinguishable from a real
    // answer, and `urgency: "later"` is not a neutral middle: it demotes the
    // category in the roadmap. A tool that refuses to state a savings figure it
    // cannot support should not quietly state a Dringlichkeit the respondent
    // never gave, and the review step then made the substitution uncheckable.
    //
    // The wall of unset fields this was guarding against is handled where it
    // belongs: errors stay quiet until the step is actually attempted, each
    // unanswered question names itself, and "Werte übernehmen" fills a whole
    // category from one already answered.
    if (isNew && !stack[category]) {
      stack[category] = {};
    }
  }

  return { ...draft, selectedCategories, stack };
}

/** Assembles the parts of the draft a given step is responsible for. */
function subjectFor(step: StepId, draft: Draft): unknown {
  switch (step) {
    case "organization":
      return draft.org;
    case "operating":
      return { ...draft.operating, ...draft.workplace, ...draft.rates };
    case "stack":
      return draft.selectedCategories;
    case "detail":
      return stackEntries(draft);
    case "ai":
      return draft.ai;
    case "review":
      return null;
  }
}

export type ErrorTranslator = (
  key: string,
  params?: Record<string, string | number | Date>,
) => string;

/**
 * Maps a Zod issue to a translation key rather than showing `issue.message`.
 *
 * Zod's built-in messages are English and were never meant for end users —
 * "Invalid option: expected one of..." is meaningless to the German-speaking
 * audience this wizard is for. Keying off `issue.code` instead of the message
 * text keeps this independent of Zod's wording and of any custom `message`
 * set on a schema.
 */
function messageForIssue(issue: z.core.$ZodIssue, t: ErrorTranslator): string {
  switch (issue.code) {
    case "invalid_value":
      return t("selectOption");
    case "too_small":
      return t("numberTooSmall", {
        min: Number((issue as { minimum?: number }).minimum ?? 0),
      });
    case "too_big":
      return t("numberTooBig", {
        max: Number((issue as { maximum?: number }).maximum ?? 0),
      });
    case "invalid_type":
      return t("required");
    default:
      return t("invalid");
  }
}

/** Falls back to the raw key so callers without a translator (tests) still work. */
const defaultTranslator: ErrorTranslator = (key) => key;

export function validateStep(
  step: StepId,
  draft: Draft,
  t: ErrorTranslator = defaultTranslator,
): StepIssues {
  const schema = STEP_SCHEMAS[step];
  if (!schema) return {};

  const result = schema.safeParse(subjectFor(step, draft));
  if (result.success) return {};

  const issues: StepIssues = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "_";
    issues[key] ??= messageForIssue(issue, t);
  }
  return issues;
}

/** Builds the final payload. Returns null while anything is still missing. */
export function toAssessment(
  draft: Draft,
  locale: "de" | "en",
): AssessmentInput | null {
  const result = assessmentInputSchema.safeParse({
    schemaVersion: INTAKE_SCHEMA_VERSION,
    locale,
    org: draft.org,
    operating: draft.operating,
    workplace: draft.workplace,
    rates: draft.rates,
    stack: stackEntries(draft),
    ai: draft.ai,
  });

  return result.success ? result.data : null;
}

function loadDraft(): Draft {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...emptyDraft(), ...(JSON.parse(stored) as Draft) };
  } catch {
    // A corrupt or unreadable draft is not worth failing over; start fresh.
  }
  return emptyDraft();
}

/**
 * True only once the client has taken over.
 *
 * Reading localStorage during render would break hydration, and restoring it in
 * an effect causes a cascading re-render. This subscribes to a store that never
 * changes, with different server and client snapshots — so the value flips once,
 * during hydration, and the draft can then be read straight into initial state.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function useWizard() {
  const t = useTranslations("wizard.errors");
  const [draft, setDraft] = useState<Draft>(loadDraft);
  const [stepIndex, setStepIndex] = useState(0);
  /**
   * Steps the user has tried to leave.
   *
   * Validation runs on every render, so an untouched step is invalid the
   * instant it appears (nothing has been filled in yet). Gating the visible
   * issues on this set means a freshly shown step — or a freshly added
   * category within it — stays quiet until the user actually attempts to
   * move on, instead of greeting them with a wall of errors.
   */
  const [attempted, setAttempted] = useState<Partial<Record<StepId, boolean>>>({});

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // Private browsing or a full quota. The wizard still works in memory.
    }
  }, [draft]);

  const step = STEPS[stepIndex]!;
  const stepIssues = validateStep(step, draft, t);
  const canAdvance = Object.keys(stepIssues).length === 0;
  const issues = attempted[step] ? stepIssues : {};

  const update = useCallback((patch: (current: Draft) => Draft) => {
    setDraft((current) => patch(current));
  }, []);

  const clear = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing to clean up.
    }
    setDraft(emptyDraft());
    setStepIndex(0);
    setAttempted({});
  }, []);

  /**
   * Whether the last attempt to leave this step failed.
   *
   * Drives the error summary. Clicking "Weiter" on an incomplete step used to
   * do nothing visible: focus stayed on the button, the page did not move, and
   * the first error could be seven hundred pixels above.
   */
  const blocked = Boolean(attempted[step]) && !canAdvance;

  const next = useCallback(() => {
    setAttempted((current) => ({ ...current, [step]: true }));
    if (canAdvance) {
      setStepIndex((index) => Math.min(index + 1, STEPS.length - 1));
    }
  }, [step, canAdvance]);

  return {
    draft,
    update,
    clear,
    step,
    stepIndex,
    setStepIndex,
    issues,
    canAdvance,
    blocked,
    next,
    back: () => setStepIndex((index) => Math.max(index - 1, 0)),
  };
}
