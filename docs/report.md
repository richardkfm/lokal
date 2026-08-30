# Report and export

The report is the product's main artifact. It has to survive being forwarded to
an IT lead, a department head, a procurement officer or a mayor, and still read
as a planning brief rather than a tool dump.

## Information architecture

| Block                    | Contents                                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------ |
| Cover                    | Organization type, seats, date, rulepack version, "internal planning document"                         |
| At a glance              | Six cards: readiness, migration posture, savings outlook, AI readiness, seats affected, phase count    |
| 1 Executive summary      | Context, current state, target state, migration posture, AI posture                                    |
| 2 Key advantages         | Lock-in, sovereignty, hosting control, data location, open standards, flexibility                      |
| 3 Savings outlook        | Band, drivers, offsets, priced subscription exposure with its basis, and the model's own limits        |
| 4 Target stack           | Per category: current → recommended → backups, rationale, scalability, plus "considered and ruled out" |
| 5 Migration roadmap      | Phases 0–4: goals, systems, seats, effort, blockers, pilots, gotchas                                   |
| 6 Capacity and readiness | Readiness bands, effort against available time, gaps                                                   |
| 7 Local-AI lane          | Per use case: now/pilot/later, deployment posture, risks, governance                                   |
| 8 Scalability outlook    | Current size, growth, more departments, stricter governance, broader AI, more self-hosting             |
| 9 Next steps             | Immediate actions, 30 days, pilots, caution flags                                                      |
| Method and limits        | Inputs used, what the engine does not model, rulepack version                                          |

"At a glance" is the page leadership actually reads. It stands alone on one
screen and one printed page.

## Component structure

`ReportView` composes one block per section, each reading its own slice of
`PlanningReport` — never the whole document, never the raw assessment, never the
engine. Shared primitives live in `src/components/report/indicators.tsx`:

`Meter`, `Badge`, `ComplexityDots`, `KpiCard`, `SeatImpactBar`, `Section`.

All of them are pure CSS. No charting library: canvas does not print reliably,
and six bar meters do not justify the weight. Every indicator also carries a text
label, so meaning survives greyscale printing and never depends on colour alone.

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
