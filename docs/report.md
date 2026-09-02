# Report and export

The report is the product's main artifact. It has to survive being forwarded to
an IT lead, a department head, a procurement officer or a mayor, and still read
as a planning brief rather than a tool dump.

## Information architecture

| Block                    | Contents                                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------------------------- |
| Cover                    | Organization type, seats, date, rulepack version, "internal planning document"                          |
| 0 Decision brief         | The page handed upward: horizon in months, both money columns, three risks, what leadership must supply |
| Contents                 | Printed only: the section list. No page numbers — the print route has no pagination model               |
| At a glance              | Six cards: readiness, migration posture, savings outlook, AI readiness, seats affected, **horizon**     |
| 1 Executive summary      | Context, current state, target state, migration posture, AI posture                                     |
| 2 Key advantages         | Lock-in, sovereignty, hosting control, data location, open standards, flexibility                       |
| 3 Savings outlook        | Band, drivers, offsets, priced subscription exposure and migration cost with their bases, model limits  |
| 4 Target stack           | Per category: current → recommended → backups, rationale, scalability, plus "considered and ruled out"  |
| 5 Migration roadmap      | Timeline, phases 0–4 with calendar spans, work packages, difficulty drivers, keep-for-now, client OS    |
| 6 Capacity and readiness | Readiness bands, effort against available time, the horizon, gaps                                       |
| 7 Local-AI lane          | Per use case: now/pilot/later, deployment posture, risks, governance                                    |
| 8 Scalability outlook    | Current size, growth, more departments, stricter governance, broader AI, more self-hosting              |
| 9 Next steps             | Immediate actions, 30 days, pilots, caution flags                                                       |
| Method and limits        | Inputs used, what the engine does not model, rulepack version                                           |

**§0 is the page leadership actually reads**, and it breaks to its own sheet in
print. It is strictly a _view_: every figure in it is stated elsewhere in the
document and nothing is recomputed. A §0 that could reach a different conclusion
from §5 would be the report arguing with itself, and the first reader to notice
would stop trusting both halves.

It must stay one page. §0 replaces reading rather than adding to it — if the
printed report gets longer because of it, it has failed at the thing it exists
for.

"At a glance" follows, and still stands alone on one screen.

### The three raised areas

Everything in the report used to speak at the same volume, which is why nothing
stood out. Three areas are lifted deliberately — the **timeline**, the **two
money figures**, and the **contact** — and no general weighting mechanism exists
to lift a fourth. A `Section` weight prop and a callout component were the tidier
design and were rejected on exactly that ground: a mechanism invites raising a
fourth area, then a fifth, and then nothing is raised.

Two rules bound the lifting. No new colour: every raised element uses weight,
size, position and space, and the palette was verified in phase 7. And neither
money card may use the `good` tone — phase 7 removed a green euro figure labelled
"entfällt" because green plus an amount reads as a saving whatever the label
says, and a cost in red beside an exposure in green would make the subtraction
for the reader that ADR-0004 forbids stating.

## Component structure

`ReportView` composes one block per section, each reading its own slice of
`PlanningReport` — never the whole document, never the raw assessment, never the
engine. Shared primitives live in `src/components/report/indicators.tsx`:

`Meter`, `Badge`, `ComplexityDots`, `KpiCard`, `FigureCard`, `SeatImpactBar`,
`PhaseTimeline`, `Section`.

`PhaseTimeline` is the document's only wide graphic, and deliberately the only
one: the timeframe is the question this phase exists to answer, so nothing else
competes with it for the eye. It renders twice — compact in §0, full above the
phase cards in §5 — from one derivation, so the two drawings cannot disagree
about the same plan. Its bars differ by fill and by a labelled row rather than by
hue, and the whole thing is one `role="img"` naming every phase and its span, so
a screen reader gets the summary rather than a march through the grid cells.

Phase bars are drawn on one timeline and quoted from a range. The two do not
reconcile and cannot — a bar needs a single line and an estimate has width — so
renderers draw from `startMonth`/`endMonth` and quote from `months`.

All of them are pure CSS. No charting library: canvas does not print reliably,
and six bar meters do not justify the weight. Every indicator also carries a text
label, so meaning survives greyscale printing and never depends on colour alone.

## Type scale

The report has its own scale, distinct from the app shell's. The shell is a
tool; the report is a twelve-page document that people print and forward, and
the two need different typographic authority.

Section headings are `text-2xl`, section leads and body prose `text-base` in
`--color-ink`, and `--color-faint` at `text-xs` is reserved for what it is for:
basis lines, sources, captions. Prose is capped at `68ch`.

This is a correction, not a preference. The whole report used to be `text-sm`
and `text-xs` in `--color-muted`, with `text-lg` section headings above
`text-base` card titles — two points of size between a numbered section of the
document and a subheading inside it. Scrolling it, the section boundaries were
invisible; the summary paragraph a Bürgermeister actually reads was the report's
least contrasty text.

The section number is a text node followed by a real space, not a flex child.
A flex gap is not a space, and the accessible name read "1Zusammenfassung".

## Saying a thing once

Fit criteria common to every recommendation are stated once, above the category
cards, and each card carries only what distinguishes it. Six cards repeating the
same five reasons is about thirty bullets carrying about five facts, and
repetition at that density is the specific texture of generated text — which
this audience is primed to look for. It also buried the lines that _are_
per-category analysis.

The same computation runs in `report-view.tsx` and `to-markdown.ts`, keyed on
rationale code plus parameters so `fits_chosen_ecosystem` counts as shared only
when it names the same ecosystem everywhere.

## Rendering rationale codes

The engine emits codes with parameters; the report translates them. Two things
about that are worth knowing before touching the catalogs:

- **next-intl resolves dotted keys as nested paths.** A flat `"advantage.x"` key
  in the catalog is never found at runtime. `messages/*.json` nests
  `rationale` accordingly.
- **A code's parameters must be supplied as `params`, not only as `evidence`.**
  Evidence is for traceability; params are what fill the placeholders. Supplying
  one without the other leaves `{rulepackVersion}` unresolved and prints the raw
  key into a document meant for management.

`tests/report/to-markdown.test.ts` uses a deliberately strict translator that
throws on a missing message and on an unresolved placeholder, across every
persona in both languages. That is the guard against both mistakes.

## Print

- Print styles live in `src/styles/print.css` and override token **values** — an
  ink-safe palette, no large filled surfaces — rather than restyling components.
  One set of components, two renderings.
- `@page { size: A4; margin: 18mm 16mm 20mm; }`, with a running head and
  `counter(page) / counter(pages)` in the margin boxes. Chromium renders `@page`
  margin boxes in `page.pdf()` — verified, not assumed — so this carries over to
  server-side PDF unchanged. Loose A4 sheets with nothing identifying them is
  what makes a printout read as a webpage dump rather than a Vorlage.
- `break-inside: avoid` on **cards**, and explicitly `auto` on sections.
  Sections are routinely taller than a page, so `avoid` never kept one whole; it
  only pushed a section that did not fit onto a fresh sheet and left nothing
  able to follow it in. `break-after: avoid` on headings is what actually
  prevents stranding.
- `break-before: page` before sections 4, 5 and 7. These stay: a major section
  opening on a fresh sheet is a document convention, and it is why the reference
  report is thirteen sheets rather than eleven. That is a deliberate cost.
- **The "considered and ruled out" disclosure is opened by the print tree, not
  by CSS** — `<details open={print}>`. It was CSS until v0.1.0 shipped a printed
  brief carrying the count with none of the candidates under it: the rule
  overrode `display` on the disclosure's children, and Chromium hides them
  through `::details-content`, which `display` on a child cannot reach. Both
  rules now exist, addressing both mechanisms, and
  `tests/e2e/print-and-motion.spec.ts` asserts on rendered `innerText` rather
  than on the DOM — the previous test passed either way, which is why this
  survived a release.
- Screen-only copy is hidden. `method.linkNotice` explains that the report's URL
  is unguessable but unprotected, which means nothing on a sheet of paper.
- Link targets are printed after their text, so a paper copy stays checkable.

**The print route has zero client components in its content tree.** That is the
constraint from [ADR-0002](adr/0002-print-first-pdf.md) and the only thing needed
today to make server-side PDF a later addition rather than a second
implementation. Do not add interactivity there.

## Navigation

Every section has carried a `scroll-mt-24` anchor since phase 4 and nothing
linked to one, so twelve pages scrolled past with no map. `reportSections()` is
the single list feeding both the screen rail and the printed contents — two lists
is how a section gets added to one and forgotten in the other.

The printed contents carries **no page numbers**: the print route has no
pagination model and a wrong page number is worse than none, so section numbers
are the reference and they are on every heading already.

The expert contact appears in the screen rail and, in the printed document, still
after §9. That asymmetry is deliberate: a Beschlussvorlage naming a service
provider on page one reads as advertising, which is the opposite of what an
"internes Planungsdokument" is for. On screen, where the IT lead is working and
wants the number, the rail is where it belongs.

`position: sticky` is CSS, so the rail stays a server component and ADR-0002 is
untouched by it.

## Markdown export

`toMarkdown(report, { t })` is pure — no DOM, no framework, no clock. It takes
its translator as an argument, which is what lets the tests substitute a strict
one. GitHub-flavoured, tables for the target stack, headings mirroring the
sections above, served from `GET /api/report/[id]/markdown` as an attachment.

The export locale comes from the stored assessment rather than the request, so a
report always exports in the language it was created in.

## Why the report is rendered from structured data

Every section reads from `PlanningReport`, which the engine produces from rules
and inputs. Nothing in the report is prose held in a template. That is what makes
the Markdown export, the screen view and the print view agree with each other,
and what makes server-side PDF a later addition rather than a rewrite.

## Maintainability

When a new finding type is added, the order of work is: extend the report schema,
extend the composer, add the message keys in both catalogs, then render it. A
section component that needs data the schema does not carry is a signal that the
engine — not the component — is missing a stage.
