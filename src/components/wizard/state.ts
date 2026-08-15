"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { z } from "zod";
import {
  INTAKE_SCHEMA_VERSION,
  aiPostureSchema,
  assessmentInputSchema,
  operatingModelSchema,
  orgProfileSchema,
  stackEntrySchema,
} from "@/domain/intake";
import type { AssessmentInput, StackEntry } from "@/domain/intake";
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
    stack: {},
    selectedCategories: [],
    ai: { useCases: [] },
  };
}

/** Per-step validation, so a step only reports on its own fields. */
const STEP_SCHEMAS: Record<StepId, z.ZodType | null> = {
  organization: orgProfileSchema,
  operating: operatingModelSchema,
  stack: z.array(z.string()).min(1),
  detail: z.array(stackEntrySchema).min(1),
  ai: aiPostureSchema,
  review: null,
};

export type StepIssues = Record<string, string>;

/**
 * The stack entries a draft describes.
 *
 * `currentTool` defaults to "nothing in use". The detail step invites leaving
 * that field empty — "leer lassen, wenn bislang nichts im Einsatz ist" — and an
 * untouched field has to mean the same thing as one that was typed into and
 * cleared. Without the default the step silently refuses to advance: the entry
 * fails validation on a field that has nowhere to show an error.
 */
function stackEntries(draft: Draft) {
  return draft.selectedCategories.map((category) => ({
    currentTool: { kind: "none" as const },
    ...draft.stack[category],
    category,
  }));
}

/** Assembles the parts of the draft a given step is responsible for. */
function subjectFor(step: StepId, draft: Draft): unknown {
  switch (step) {
    case "organization":
      return draft.org;
    case "operating":
      return draft.operating;
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

export function validateStep(step: StepId, draft: Draft): StepIssues {
  const schema = STEP_SCHEMAS[step];
  if (!schema) return {};

  const result = schema.safeParse(subjectFor(step, draft));
  if (result.success) return {};

  const issues: StepIssues = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "_";
    issues[key] ??= issue.message;
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
  const [draft, setDraft] = useState<Draft>(loadDraft);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // Private browsing or a full quota. The wizard still works in memory.
    }
  }, [draft]);

  const step = STEPS[stepIndex]!;
  const issues = validateStep(step, draft);

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
  }, []);

  return {
    draft,
    update,
    clear,
    step,
    stepIndex,
    setStepIndex,
    issues,
    canAdvance: Object.keys(issues).length === 0,
    next: () => setStepIndex((index) => Math.min(index + 1, STEPS.length - 1)),
    back: () => setStepIndex((index) => Math.max(index - 1, 0)),
  };
}
