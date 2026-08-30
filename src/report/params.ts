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

export function localizeParams(params: Params, t: Translate): Params {
  let localized: Params | undefined;

  for (const [name, resolver] of Object.entries(RESOLVERS)) {
    const value = params[name];
    if (typeof value !== "string" || !resolver.values.has(value)) continue;

    localized ??= { ...params };
    localized[name] = t(resolver.key(value));
  }

  return localized ?? params;
}
