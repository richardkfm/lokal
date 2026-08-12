# Report and export

The report is the product's main artifact. It has to survive being forwarded to an
IT lead, a department head, a procurement officer or a mayor, and still read as a
planning brief rather than a tool dump.

> Concrete component APIs are filled in as phase 4 lands.

## Information architecture

| Block                    | Contents                                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------ |
| Cover                    | Organization type, seats, date, rulepack version, "internal planning document"                         |
| At a glance              | Six cards: readiness, migration posture, savings outlook, AI readiness, seats affected, phase count    |
| 1 Executive summary      | Context, current state, target state, migration posture, AI posture                                    |
| 2 Key advantages         | Lock-in, sovereignty, hosting control, data location, open standards, flexibility                      |
| 3 Savings outlook        | Band, drivers, offsets, temporary-cost window, and the model's own limits                              |
| 4 Target stack           | Per category: current → recommended → backups, rationale, scalability, plus "considered and ruled out" |
| 5 Migration roadmap      | Phases 0–4: goals, systems, seats, blockers, staffing, training, coexistence, rollback caution         |
| 6 Capacity and readiness | Readiness bands, gaps, external support, pilot recommendations                                         |
| 7 Local-AI lane          | Per use case: now/pilot/later, deployment posture, risks, governance                                   |
| 8 Scalability outlook    | Current size, growth, more departments, stricter governance, broader AI, more self-hosting maturity    |
| 9 Next steps             | Immediate actions, 30 days, pilot suggestions, caution flags                                           |
| Method and limits        | Inputs used, what the engine does not model, rulepack review date                                      |

"At a glance" is the page that actually gets read by leadership. It is designed to
stand alone on one screen and one printed page.

## Component structure

One component per section. Each receives exactly its typed slice of
`PlanningReport` — never the whole document, never the raw assessment. That keeps
sections independently testable and stops report logic from leaking into the UI.

Shared primitives live in `src/components/indicators`:

`Meter`, `BandBadge`, `ComplexityDots`, `KpiCard`, `SeatImpactBar`, `PhaseCard`,
`RationaleList`, `ConsideredRuledOut`.

All of them are pure CSS. No charting library: canvas does not print reliably, and
six bar meters do not justify the weight. See
[ADR-0002](adr/0002-print-first-pdf.md).

## Styling for screen and print

- Design tokens are CSS custom properties in `src/app/globals.css`. Print styles
  override **token values** — an ink-safe palette, no large filled surfaces —
  rather than restyling components. One set of components, two renderings.
- `@page { size: A4; margin: 18mm 16mm; }` with a running header carrying
  organization type and date, and a running footer with page numbers and version.
- `break-inside: avoid` on cards and phase blocks; `break-before: page` before
  sections 4, 5 and 7.
- The print route is a separate server component tree: cover page, table of
  contents, linear layout, no navigation, no interactive elements.

## Markdown export

`toMarkdown(report, messages)` is pure — no DOM — and snapshot-tested per persona.
GitHub-flavoured, tables for the target stack, headings mirroring the sections
above. Served from `GET /api/report/[id]/markdown` as an attachment.

It is meant to be pasted into a wiki, Confluence or an email without cleanup.

## Why the report is rendered from structured data

Every section reads from `PlanningReport`, which the engine produces from rules and
inputs. Nothing in the report is written prose held in a template. That is what
makes the Markdown export, the screen view and the print view agree with each
other, and what makes server-side PDF a later addition rather than a second
implementation.

## Maintainability

When a new finding type is added, the order of work is: extend the report schema,
extend the composer, add the message keys, then render it. A section component that
needs data the schema does not carry is a signal that the engine — not the
component — is missing a stage.
