# ADR-0004: Declared rates for the cost side

- Status: accepted
- Date: 2026-09-02
- Extends ADR-0003. Does not supersede it: guardrail 5 — no net saving, no ROI,
  no payback period — stands unchanged and is restated here.

## Context

ADR-0003 let lokal state what the current subscriptions cost. It deliberately
said nothing about what the migration costs, on this reasoning:

> Gross exposure and avoided subscription cost only. Never a net saving, never
> an ROI, never a payback period. Hosting, support, training and internal time
> are real costs that lokal does not price, and pretending otherwise would
> reproduce exactly the failure the old rule guarded against.

That produced a report with one side of a ledger. It states an annual
subscription figure and, a page later, "9–20 Verwaltungstage" in prose — a
number the reader cannot compare with the first one. An IT lead who wants to
take the plan to a Geschäftsführung or a Kämmerei is left doing the arithmetic
on a napkin, and the plan's own effort figures are the input they would use.

The gap is narrower than it looks. ADR-0003's first guardrail is not "lokal
states no cost"; it is:

> lokal never invents a price. Every figure is the organization's own declared
> seat count multiplied by a vendor's own published list price.

An organization's internal day rate is a fact it knows and lokal does not. The
objection in ADR-0003 was to lokal _estimating_ internal time — not to an
organization declaring what its own time costs.

## Decision

lokal states the cost of the migration, under a generalization of ADR-0003's
first guardrail:

> Every euro figure is a quantity the organization declared, or one lokal
> derived from what it declared, multiplied by a unit price that either the
> organization declared or a vendor published.

Concretely: effort days the engine already computes, multiplied by an internal
day rate and an external day rate the respondent enters in the intake. Six
guardrails, which are again the substance of the decision:

1. **No rate declared, no figure.** Both rate fields are optional and neither
   has a default. There is no "typical German day rate", no regional table, no
   interpolation from organization size. Unset means the cost column is absent
   from the report — the same discipline as `LOKAL_EXPERT_*`, which renders
   nothing rather than an example contact, and for the same reason: a
   plausible placeholder looks discharged.

2. **The basis travels with the number.** "18–35 Tage × 480 €/Tag (von Ihnen
   angegeben)", never a bare sum, in every renderer. Identical in form to
   ADR-0003 guardrail 3, and for the identical reason.

3. **The two columns are not subtractable, and the report says so next to
   them.** lokal prices neither the hosting of the new stack, nor its support
   contracts, nor productivity loss during the changeover, nor the residual
   licences an organization keeps. Subtracting one column from the other
   produces a number that is wrong in a direction lokal cannot bound. The
   caveat sits between the figures rather than beneath them, because a reader
   who sees two amounts side by side will subtract them.

4. **No net saving, no ROI, no payback, no break-even.** Restated from ADR-0003
   guardrail 5 and permanently deferred in `plans/roadmap.md`. Every ingredient
   an amortisation figure needs is one of the costs named in guardrail 3, which
   is exactly why lokal cannot produce one honestly.

5. **Ranges stay ranges.** Effort is a band, so cost is a band. A single figure
   would be a quote, and `docs/engine.md` has said since stage 6 that these are
   planning estimates and not quotes.

6. **Coverage is stated**, as in ADR-0003 guardrail 4. When external support is
   likely for 2 of 6 migrations and only an internal rate was given, the report
   says which part of the plan the figure covers and which part it does not.

## What this does not change

- The engine stays pure and emits `{ amountCents, currency }`. The `€` glyph in
  `src/engine`, `src/rulepack` or `src/report` remains a lint error; renderers
  format money through `src/report/money.ts`.
- The qualitative savings band is untouched and still leads section 3
  (ADR-0003 guardrail 6).
- Priced subscription exposure is untouched: still seats × a vendor's published
  list price, still with plan name, source and observation date.
- No LLM is involved (ADR-0001).
- lokal still makes no compliance claim.

## Consequences

**Good.** An IT lead can hand the first page to a decision-maker and it carries
both numbers a decision-maker asks for, each with a basis they can check — the
seat count against their invoice, the day rate against their own personnel
costing.

**Costs.** The intake grows by two optional questions, and most respondents will
skip them, so the most common report still has no cost column. That is the
correct outcome and not a defect to design around: the alternative is a
fabricated rate, and a fabricated rate is the fastest way to lose this audience.

**Risk accepted.** A reader may subtract the columns anyway. Guardrails 2, 3 and
4 make that hard: the figures are ranges, the caveat is between them rather than
below them, and neither figure is styled to read as a benefit. Phase 7 already
removed a green euro amount labelled "entfällt" for the same reason, and that
precedent binds here — neither column may be rendered in the "good" tone.
