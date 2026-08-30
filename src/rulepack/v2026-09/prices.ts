import type { ListPrice, SourceTool } from "../schema";

/**
 * Published list prices, overlaid onto v2026-08's source tools.
 *
 * Every figure here was read from the vendor's own German price page on
 * `OBSERVED`, and nothing else is permitted (ADR-0003). What is *not* here
 * matters as much as what is:
 *
 * - **Google Workspace, Slack, Dropbox.** Their German pages render prices
 *   client-side or quote USD, so no euro figure can be cited. They carry no
 *   price, and the report counts them as a coverage gap rather than borrowing a
 *   reseller's number.
 * - **Locally installed Office, file servers, paper processes.** Not per-seat
 *   subscriptions. A perpetual licence is not recurring exposure, and treating
 *   it as one would overstate the case for migrating.
 *
 * The Microsoft entries all share `bundleId: "microsoft-365"`. An organization
 * typically runs one Microsoft 365 subscription that covers office, files, chat,
 * intranet, forms and document storage at once; counting each of those
 * categories separately would multiply a single invoice by five. The engine
 * counts the bundle once.
 */

const OBSERVED = "2026-08-30";

/** https://www.microsoft.com/de-de/microsoft-365/business/ — "Preise zzgl. MwSt." */
function microsoft(planName: string, amountCents: number, source: string): ListPrice {
  return {
    planName,
    amountCents,
    currency: "EUR",
    billingTerm: "annual_commitment",
    taxBasis: "net",
    bundleId: "microsoft-365",
    observedOn: OBSERVED,
    source,
  };
}

const APPS_FOR_BUSINESS = microsoft(
  "Microsoft 365 Apps for Business",
  1100,
  "https://www.microsoft.com/de-de/microsoft-365/business/microsoft-365-apps-for-business",
);

const BUSINESS_BASIC = microsoft(
  "Microsoft 365 Business Basic",
  607,
  "https://www.microsoft.com/de-de/microsoft-365/business/compare-all-microsoft-365-business-products",
);

/**
 * Which source tool gets which plan.
 *
 * `microsoft-365-apps` is the desktop Office applications, so it is priced at
 * Apps for Business (11,00 €) rather than Business Standard (12,13 €), even
 * though Standard is the more commonly bought plan. Where two readings are
 * defensible the rulepack takes the lower one: an understated figure costs a
 * little credibility, an overstated one costs all of it.
 *
 * The remaining Microsoft services are priced at Business Basic, the cheapest
 * plan that actually provides them. Since they share the bundle id, this only
 * affects the figure when Basic is the *highest* price in the bundle — that is,
 * when the organization runs no desktop Office at all.
 */
export const listPrices: Record<string, ListPrice> = {
  "microsoft-365-apps": APPS_FOR_BUSINESS,
  "sharepoint-onedrive": BUSINESS_BASIC,
  "microsoft-teams": BUSINESS_BASIC,
  "sharepoint-intranet": BUSINESS_BASIC,
  "sharepoint-dms": BUSINESS_BASIC,
  "microsoft-forms": BUSINESS_BASIC,
};

/** Returns the v2026-08 source tools with prices attached where one is citable. */
export function withListPrices(tools: SourceTool[]): SourceTool[] {
  return tools.map((tool) => {
    const listPrice = listPrices[tool.id];
    return listPrice ? { ...tool, listPrice } : tool;
  });
}
