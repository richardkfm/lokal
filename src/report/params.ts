import { CATEGORY_IDS } from "@/domain/enums";
import type { RationaleItem } from "@/domain/rationale";

/**
 * Resolves enum-valued rationale parameters into readable labels.
 *
 * The engine emits stable codes and raw parameters, never sentences — that is
 * what keeps it pure and what lets one plan render in two languages. The cost is
 * that a parameter holding an enum value reaches the reader verbatim unless a
 * renderer resolves it, which is how "office_docs: bessere Ausstiegsmöglichkeiten"
 * ends up in a document going to a council meeting.
 *
 * Shared by every renderer so the screen, the Markdown export and the printed
 * brief cannot disagree about it.
 */

const CATEGORIES = new Set<string>(CATEGORY_IDS);

type Params = RationaleItem["params"];
type Translate = (key: string) => string;

export function localizeParams(params: Params, t: Translate): Params {
  const value = params.category;
  if (typeof value !== "string" || !CATEGORIES.has(value)) return params;

  return { ...params, category: t(`vocabulary.category.${value}.label`) };
}
