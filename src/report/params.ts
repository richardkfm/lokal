import {
  AI_USE_CASE_IDS,
  CATEGORY_IDS,
  HARDWARE_PROFILES,
  LEVELS,
  ORG_TYPES,
  READINESS_LABELS,
} from "@/domain/enums";
import type { RationaleItem } from "@/domain/rationale";
import { DIFFICULTY_LABELS } from "@/engine/difficulty";

/**
 * Resolves enum-valued rationale parameters into readable labels.
 *
 * The engine emits stable codes and raw parameters, never sentences — that is
 * what keeps it pure and what lets one plan render in two languages. The cost is
 * that a parameter holding an enum value reaches the reader verbatim unless a
 * renderer resolves it, which is how "office_docs: bessere Ausstiegsmöglichkeiten"
 * and "Hoher Aufwand (very_high)" end up in a document going to a council
 * meeting.
 *
 * The table below is the whole defence, so it has to be complete rather than
 * grown one leak at a time: every parameter any stage passes an enum through is
 * listed, matched against that enum's own values, and left untouched when the
 * value is not one of them. `tests/report/params.test.ts` walks every persona's
 * rendered report and fails on any raw enum token that survives, which is what
 * keeps this table honest as stages are added.
 *
 * Shared by every renderer so the screen, the Markdown export and the printed
 * brief cannot disagree about it.
 */

type Params = RationaleItem["params"];
type Translate = (key: string) => string;

/** A parameter's value domain, and where its label lives in the catalogue. */
type Resolver = {
  values: ReadonlySet<string>;
  key: (value: string) => string;
};

function vocabulary(namespace: string, values: readonly string[]): Resolver {
  return {
    values: new Set<string>(values),
    key: (value) => `vocabulary.${namespace}.${value}.label`,
  };
}

/**
 * Keyed by parameter name rather than by value, because the same enum reaches
 * the reader under different names — `category` and `dependsOn` are both
 * category ids — and because a name is what a stage author actually chooses.
 */
const RESOLVERS: Record<string, Resolver> = {
  category: vocabulary("category", CATEGORY_IDS),
  dependsOn: vocabulary("category", CATEGORY_IDS),
  orgType: vocabulary("orgType", ORG_TYPES),
  useCase: vocabulary("aiUseCase", AI_USE_CASE_IDS),
  sensitivity: vocabulary("dataSensitivity", LEVELS),
  required: vocabulary("hardwareProfile", HARDWARE_PROFILES),
  available: vocabulary("hardwareProfile", HARDWARE_PROFILES),
  difficulty: {
    values: new Set<string>(DIFFICULTY_LABELS),
    key: (value) => `report.difficulty.${value}`,
  },
  readiness: {
    values: new Set<string>(READINESS_LABELS),
    key: (value) => `report.readinessLabel.${value}`,
  },
};

/**
 * Labels the catalogue cannot supply.
 *
 * Two families of identifier reach the reader, and only one of them lives in
 * `messages/*.json`. The other — prerequisite ids, and anything else the
 * rulepack names — carries its own `{ de, en }` label in rulepack content, so
 * no message key exists to look it up by. The resolver table above structurally
 * cannot reach those, which is how `Voraussetzung schaffen: identity-directory`
 * printed in section 9 while section 5 rendered the same six prerequisites as
 * "Zentrale Benutzerverwaltung" and the rest.
 *
 * Renderers pass them in, because they are the only layer that knows the
 * reader's locale, and `PlanningReport` already carries every label needed —
 * see `prerequisiteLabels` below.
 */
export type DocumentLabels = Partial<Record<string, Record<string, string>>>;

/**
 * The prerequisite labels a report contains, ready to substitute.
 *
 * Taken from the document rather than the rulepack so a stored assessment
 * rendered later reads the labels its own report was built with.
 */
export function prerequisiteLabels(
  phases: readonly {
    prerequisites: readonly { id: string; label: { de: string; en?: string } }[];
  }[],
  locale: string,
): DocumentLabels {
  const prerequisite: Record<string, string> = {};

  for (const phase of phases) {
    for (const entry of phase.prerequisites) {
      prerequisite[entry.id] =
        locale === "en" ? (entry.label.en ?? entry.label.de) : entry.label.de;
    }
  }

  return { prerequisite };
}

export function localizeParams(
  params: Params,
  t: Translate,
  labels: DocumentLabels = {},
): Params {
  let localized: Params | undefined;

  for (const [name, resolver] of Object.entries(RESOLVERS)) {
    const value = params[name];
    if (typeof value !== "string" || !resolver.values.has(value)) continue;

    localized ??= { ...params };
    localized[name] = t(resolver.key(value));
  }

  for (const [name, byId] of Object.entries(labels)) {
    const value = params[name];
    if (typeof value !== "string") continue;

    const label = byId?.[value];
    if (label === undefined) continue;

    localized ??= { ...params };
    localized[name] = label;
  }

  return localized ?? params;
}
