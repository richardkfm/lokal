import type { CategoryId } from "@/domain/enums";
import type { Rulepack } from "@/rulepack/schema";

/**
 * The products the intake can offer by name, per category.
 *
 * This exists so the wizard can record *which* product an organization is on
 * rather than only what they called it. The difference is not cosmetic: a
 * `{ kind: "known", id }` entry is what lets the engine reach the rulepack's
 * `vendorLockIn` rating, the origin-specific migration edges, and — since
 * ADR-0003 — the vendor's published list price. Free text reaches none of it,
 * so an intake that only ever produced free text left the whole source-tool
 * half of the rulepack unreachable and every report's priced exposure empty.
 *
 * Matching typed text against these names was the alternative and is rejected
 * on purpose. A fuzzy match that resolves "Microsoft" to a specific plan would
 * attribute a euro figure to an organization that never named it, which is the
 * one thing ADR-0003 forbids. Naming the product is the respondent's choice to
 * make, so it is a choice the form asks them to make.
 *
 * Only the fields the browser needs cross the boundary — the rulepack itself
 * stays on the server rather than being shipped into the client bundle.
 */

export type SourceToolOption = { id: string; name: string };

export type SourceToolOptions = Partial<Record<CategoryId, SourceToolOption[]>>;

export function sourceToolOptions(pack: Rulepack): SourceToolOptions {
  const byCategory: SourceToolOptions = {};

  for (const tool of pack.sourceTools) {
    // Rulepack order is kept rather than sorted: entries are already grouped by
    // category and written most-common first, and a list that reorders itself
    // between visits is harder to answer than one that does not.
    (byCategory[tool.category] ??= []).push({ id: tool.id, name: tool.name });
  }

  return byCategory;
}
