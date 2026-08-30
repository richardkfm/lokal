import type { PlanningReport, PriceBasis } from "./schema";

/**
 * Money formatting, shared by every renderer.
 *
 * The document carries integers in minor units plus a currency code; this is the
 * only place they become text. Keeping it in one function is what stops the
 * screen view, the Markdown export and the print route from disagreeing about a
 * figure that someone is going to check against an invoice.
 *
 * `Intl.NumberFormat` produces the currency symbol, so no euro glyph is written
 * by hand anywhere in the pure layers — which is exactly what the lint rule in
 * `eslint.config.mjs` is checking for.
 */

type Locale = PlanningReport["locale"];
type Currency = "EUR";

const BCP47: Record<Locale, string> = { de: "de-DE", en: "en-IE" };

/** A whole-euro amount. Cents on an annual figure are noise on a planning brief. */
export function formatAmount(
  cents: number,
  currency: Currency,
  locale: Locale,
): string {
  return new Intl.NumberFormat(BCP47[locale], {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Math.round(cents / 100));
}

/** A per-seat monthly price, where the cents are the whole point. */
export function formatUnitPrice(
  cents: number,
  currency: Currency,
  locale: Locale,
): string {
  return new Intl.NumberFormat(BCP47[locale], {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/**
 * An observation date, in the reader's own convention.
 *
 * The rulepack stores ISO dates because that is what a diff-reviewable source
 * file should carry. A German report that says "erhoben am 2026-08-30" three
 * lines under a header reading "30. August 2026" has two date formats on one
 * page, and the ISO one reads as machine output — which is the wrong signal
 * beside the only figures in the document a reader will check against an
 * invoice.
 */
export function formatObservedOn(iso: string, locale: Locale): string {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;

  return new Intl.DateTimeFormat(BCP47[locale], {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/**
 * The basis line that must travel with every figure (ADR-0003 guardrail 3).
 *
 * A euro amount without its plan name, billing term, tax basis and observation
 * date is a number the reader has to take on faith, and a planning tool that
 * asks for faith on money has already lost the room.
 */
export function basisLine(
  basis: PriceBasis,
  currency: Currency,
  locale: Locale,
  t: (key: string, values?: Record<string, string | number>) => string,
): string {
  return t("report.savings.basisLine", {
    plan: basis.planName,
    unit: formatUnitPrice(basis.amountCents, currency, locale),
    seats: basis.seats,
    term: t(`report.savings.term.${basis.billingTerm}`),
    tax: t(`report.savings.tax.${basis.taxBasis}`),
    observed: formatObservedOn(basis.observedOn, locale),
  });
}
