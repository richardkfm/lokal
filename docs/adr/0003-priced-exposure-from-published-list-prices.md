# ADR-0003: Priced subscription exposure from published list prices

- Status: accepted
- Date: 2026-08-30
- Supersedes the "no euro amounts" half of CLAUDE.md rule 4 and ADR-0001's
  cost-modelling aside. Does not touch ADR-0001's ruling on LLMs.

## Context

Until now lokal stated no euro figure anywhere. The savings outlook was a
qualitative band (`low` / `moderate` / `strong`) with named drivers and offsets,
enforced by an ESLint rule over `src/engine`, `src/rulepack` and `src/report`,
by seven test assertions, and by README's "Not a cost calculator".

That rule was written against a specific failure: a planning tool that invents a
euro figure gets dismissed by the one person in the room who knows the real
contract. The reasoning was sound and the failure is real.

It also cost lokal something. "Moderate savings outlook" is not an argument a
treasurer or a Kämmerer can take into a budget discussion. The organizations
lokal targets are asked to spend admin capacity and political capital on a
migration, and the first question in that room is how much the current
subscriptions cost. lokal knew the seat counts and said nothing.

## Decision

lokal states euro figures for **current subscription exposure** and for the part
of it a migration removes. It does so under six guardrails, which are the
substance of this decision rather than caveats on it.

1. **lokal never invents a price.** Every figure is the organization's own
   declared seat count multiplied by a vendor's own published list price. There
   is no pricing model, no estimation, no interpolation.
2. **Prices live in the rulepack**, versioned and immutable like every other
   claim about a real product, each carrying `planName`, `billingTerm`,
   `taxBasis`, `observedOn` and a `source` URL.
3. **No figure appears without its basis.** Plan name, billing term, net or
   gross, source link and observation date travel with the number, in every
   renderer.
4. **Coverage is always stated.** When 4 of 7 assessed categories carry a
   recorded price, the report says so. A partial sum is never presented as a
   total.
5. **Gross exposure and avoided subscription cost only.** Never a net saving,
   never an ROI, never a payback period. Hosting, support, training and internal
   time are real costs that lokal does not price, and pretending otherwise would
   reproduce exactly the failure the old rule guarded against.
6. **The qualitative band stays, and stays primary.** The euro figure is
   evidence underneath it, not a replacement for it.

## Why the source has to be the vendor

Researching prices for this change turned up 12,13 €, 14,56 €, 13,60 € and
26,10 € per seat per month for comparable plans, depending on which reseller,
comparison site or blog was asked. Resellers quote their own margins, contract
terms and bundles.

Only the vendor's own price page is citable, and the schema requires one.
Where a vendor renders prices client-side and no figure can be read from a
citable page, **no price is recorded** — the coverage line then reports the gap.
An honest hole is worth more than a plausible number, which is the same
principle the rulepack already applies to product ratings.

## What this does not change

- The engine stays pure and emits `{ amountCents, currency }` — numbers and a
  currency code, never a formatted string. Money is formatted by renderers via
  `Intl.NumberFormat`, so the `€` glyph never appears in a pure layer. The
  ESLint rule is narrowed to the glyph rather than removed.
- The savings band computation is untouched.
- No LLM is involved (ADR-0001).
- lokal still makes no compliance claim, and still does not model hosting,
  support or staff time.

## Consequences

**Good.** The report answers the first question a budget holder asks, with a
figure they can verify against their own invoice in about a minute. The audit
trail makes it checkable rather than authoritative.

**Costs.** Prices go stale faster than product ratings, so `observedOn` is a
separate field from the entry's `lastReviewed` and is shown to the reader. A
pack whose prices have aged states an old date rather than silently drifting.
Price coverage will always be partial, and the report has to keep saying so.

**Risk accepted.** A reader may still take a gross exposure figure for a net
saving. Guardrails 3, 5 and 6 exist to make that hard: the number is labelled as
today's subscription spend, the offsets sit next to it, and the qualitative band
still leads the section.
