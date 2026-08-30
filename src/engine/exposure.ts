import type { CategoryId } from "@/domain/enums";
import { rationale, type RationaleItem } from "@/domain/rationale";
import type { ListPrice, Rulepack } from "@/rulepack/schema";
import type { NormalizedAssessment } from "./normalize";
import type { Sequencing } from "./sequencing";

/**
 * Current subscription exposure, priced from published list prices.
 *
 * This is the only place lokal turns anything into money, and the arithmetic is
 * deliberately trivial: seats the user declared, times a price the vendor
 * published, times twelve. There is no pricing model, no estimation and no
 * inflation curve, because every one of those would be lokal inventing a number
 * — the failure ADR-0003 exists to prevent.
 *
 * Amounts are integers in minor units and travel with a currency code, never a
 * formatted string. Rendering is a renderer's job, where the locale is known.
 */

export type PriceBasis = {
  /** The source tool whose published price sets this line. */
  toolId: string;
  toolName: string;
  planName: string;
  /** Per seat, per month, in minor units. */
  amountCents: number;
  billingTerm: ListPrice["billingTerm"];
  taxBasis: ListPrice["taxBasis"];
  observedOn: string;
  source: string;
  /** Seats this line is counted at. */
  seats: number;
  annualCents: number;
  /** Every assessed category this one subscription covers. */
  categories: CategoryId[];
  /** Categories on this subscription that the roadmap does not replace. */
  remainingCategories: CategoryId[];
  /** True only when the roadmap replaces every service on the subscription. */
  fallsAway: boolean;
};

export type SubscriptionExposure = {
  currency: "EUR";
  /** Today's annual exposure across the categories that carry a price. */
  annualCents: number;
  /** The part of it the roadmap actually removes. */
  avoidedAnnualCents: number;
  seatsPriced: number;
  /** Coverage. Rendered every time, so a partial sum is never read as a total. */
  categoriesPriced: number;
  categoriesAssessed: number;
  basis: PriceBasis[];
  /** Limitations and partial-migration warnings, as codes. */
  notes: RationaleItem[];
};

type Group = {
  key: string;
  price: ListPrice;
  toolId: string;
  toolName: string;
  seats: number;
  categories: CategoryId[];
};

/**
 * Prices the assessed stack.
 *
 * Returns `null` when nothing in the stack carries a published price, which is
 * a perfectly normal outcome — an organization on Google Workspace, Slack and
 * Dropbox has no citable euro figure anywhere, and the report says so rather
 * than reaching for a reseller's number.
 */
export function assessExposure(
  assessment: NormalizedAssessment,
  sequencing: Sequencing,
  pack: Rulepack,
): SubscriptionExposure | null {
  const scheduled = new Set<CategoryId>(
    sequencing.phases.flatMap((phase) => phase.migrations.map((m) => m.category)),
  );

  /**
   * One entry per *subscription*, not per category.
   *
   * A Kommune that lists Microsoft 365 under office, files, chat, intranet and
   * forms has one invoice, not five. Grouping by bundle is what keeps the
   * headline figure from being wrong by a factor large enough to discredit
   * everything around it.
   */
  const groups = new Map<string, Group>();

  for (const entry of assessment.input.stack) {
    const currentTool = entry.currentTool;
    // A free-text or absent incumbent has no published price by definition, and
    // guessing one from its label is exactly what this module must not do.
    if (currentTool.kind !== "known") continue;

    const tool = pack.sourceTools.find((s) => s.id === currentTool.id);
    const price = tool?.listPrice;
    if (!tool || !price) continue;

    const key = price.bundleId ?? tool.id;
    const existing = groups.get(key);

    if (!existing) {
      groups.set(key, {
        key,
        price,
        toolId: tool.id,
        toolName: tool.name,
        seats: entry.seats,
        categories: [entry.category],
      });
      continue;
    }

    // Within one subscription, take the dearest plan and the largest seat count
    // seen, and count them once. Taking a sum here would be the fivefold error.
    existing.categories.push(entry.category);
    existing.seats = Math.max(existing.seats, entry.seats);
    if (price.amountCents > existing.price.amountCents) {
      existing.price = price;
      existing.toolId = tool.id;
      existing.toolName = tool.name;
    }
  }

  if (groups.size === 0) return null;

  const notes: RationaleItem[] = [];
  const basis: PriceBasis[] = [];
  let annualCents = 0;
  let avoidedAnnualCents = 0;
  let seatsPriced = 0;
  let categoriesPriced = 0;

  for (const group of [...groups.values()].sort((a, b) => a.key.localeCompare(b.key))) {
    const categories = [...group.categories].sort();
    const remainingCategories = categories.filter((c) => !scheduled.has(c));

    /**
     * A subscription falls away only when the roadmap replaces every service on
     * it. Migrating office documents off Microsoft 365 while chat and intranet
     * stay on it does not end the invoice — and saying otherwise would be the
     * single most tempting way to overstate this figure.
     *
     * It is also a genuinely useful planning statement, and one an alternatives
     * list can never make: it tells the reader which remaining service is the
     * thing standing between them and a cancelled contract.
     */
    const fallsAway = remainingCategories.length === 0;
    const lineAnnual = group.seats * group.price.amountCents * 12;

    annualCents += lineAnnual;
    seatsPriced += group.seats;
    categoriesPriced += categories.length;
    if (fallsAway) avoidedAnnualCents += lineAnnual;

    basis.push({
      toolId: group.toolId,
      toolName: group.toolName,
      planName: group.price.planName,
      amountCents: group.price.amountCents,
      billingTerm: group.price.billingTerm,
      taxBasis: group.price.taxBasis,
      observedOn: group.price.observedOn,
      source: group.price.source,
      seats: group.seats,
      annualCents: lineAnnual,
      categories,
      remainingCategories,
      fallsAway,
    });

    if (!fallsAway && remainingCategories.length < categories.length) {
      notes.push(
        rationale({
          code: "savings.subscription_not_fully_replaced",
          severity: "caution",
          params: {
            plan: group.price.planName,
            remaining: remainingCategories.length,
          },
          evidence: [{ field: "roadmap.keepForNow", value: remainingCategories }],
        }),
      );
    }
  }

  const categoriesAssessed = assessment.input.stack.length;

  // Always stated, so nobody reads a partial figure as a total. Google, Slack
  // and Dropbox publish no euro list price on a citable page, so a stack built
  // on those produces a large and entirely legitimate gap.
  if (categoriesPriced < categoriesAssessed) {
    notes.push(
      rationale({
        code: "savings.priced_exposure_partial",
        severity: "note",
        params: { priced: categoriesPriced, assessed: categoriesAssessed },
        evidence: [{ field: "stack", value: categoriesAssessed }],
      }),
    );
  }

  notes.push(
    rationale({
      code: "savings.prices_are_list_prices",
      severity: "note",
    }),
  );

  return {
    currency: "EUR",
    annualCents,
    avoidedAnnualCents,
    seatsPriced,
    categoriesPriced,
    categoriesAssessed,
    basis,
    notes,
  };
}
