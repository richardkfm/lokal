# Phase 7 — The report as a document

## Why this phase exists

v0.1.0 shipped a product whose parts are individually good and whose deliverable
is not yet a document. That distinction is the whole of this phase.

Three defects found by driving the running app rather than reading the tests are
already fixed on this branch: the intake could not name a product, so the priced
exposure was unreachable for every real report; machine identifiers reached the
reader; and the landing page's connectors rendered at zero width. Each passed
every check while producing nothing, which is the pattern worth noticing — the
suite tested the mechanisms and never looked at the output.

A design and UX review of the running build then found the rest. Its central
observation is the one that organises this phase:

> The **system** underneath this is unusually good […] What's weaker is the
> **document**: the report reads like an app screen that happens to print, not
> like a Vorlage.

That matters more here than it would elsewhere. Definition-of-done item 4 is "the
printed PDF is presentable to management without editing", and it is still open.
The findings below are the reasons it is still open.

Two of them are outright content loss, verified before being believed:

- **"Geprüft und ausgeschieden" does not print.** The `<details>` block renders
  as a bare "2 geprüft und ausgeschieden" line with no content: the element
  measures 16px tall while its child measures 45. `print.css` overrides `display`
  on the children, but Chromium hides them through `::details-content`, so the
  override reaches nothing. CLAUDE.md names "considered and ruled out" as one of
  four outputs that prove the thesis, and it is absent from the artefact that
  reaches the council.
- **English reports serve German prose.** `report-view.tsx` pins `localized()`
  and the date format to the _stored intake_ locale rather than the request
  locale, so `/en` returns German tool summaries, prerequisite labels, AI
  descriptions and "30. August 2026". The message catalogue is at 620/620 parity;
  this is the last mile undoing it.

## Scope

Grouped as they will be committed, in dependency order.

1. **Print** — ruled-out content on paper; `break-inside` on sections; page
   numbers and a running head; screen-only copy hidden.
2. **Locale** — request locale drives rulepack prose and dates; one date format;
   ICU plurals.
3. **Numbers** — the doubled euro tile; "735 von 180 insgesamt"; contiguous
   phase numbering.
4. **Typography and repetition** — a document type scale distinct from the app
   shell; §4's repeated criteria as one matrix; §2 earning its place.
5. **Questionnaire** — seeded answers marked as seeded; a review step that shows
   every answer; an error summary that moves focus.
6. **Landing** — the closing section's collapse; legal pages; copy duplication.
7. **Accessibility** — severity not by colour alone; indicator contrast; target
   sizes.

## Out of scope

- **Writing Impressum, Datenschutzerklärung or Barrierefreiheitserklärung
  text, or hosting it.** They ship as `LOKAL_LEGAL_*_URL` links to pages the
  operator already publishes, not as internal routes rendering operator-supplied
  markup — which was the other option and needs a content pipeline for three
  pages that every Kommune and Stadtwerk in the audience already has. These are legal declarations about a specific operator: their name,
  address, data-protection officer, and their own conformance assessment. lokal
  cannot author them and a placeholder is worse than an absence, because a
  placeholder looks discharged. What ships is the structure — routes, footer
  links, and operator-supplied content — with the pages absent until configured,
  the same contract `LOKAL_EXPERT_*` already uses.
- **A new rulepack version.** `fit.fits_chosen_ecosystem` renders "Verbund
  (nextcloud)" because an ecosystem has no label anywhere in the rulepack.
  Fixing it edits rulepack content, and released packs are immutable. It is
  recorded in `tests/report/params.test.ts` as a named exception and belongs to
  whichever version comes next.
- **Server-side PDF.** Still v0.3.0. This phase makes the printed page worth
  generating; it does not generate it.
- **Dark mode.** Unchanged reasoning.
- **Reworking the engine.** Every finding here is in a renderer, a stylesheet or
  the intake. The engine's output is not in question.

## Decisions

**The print tree opens its disclosures, rather than CSS forcing them open.** The
print route is already a separate render (ADR-0002) and already passes a `print`
flag down. `<details open>` is one prop, needs no knowledge of how a given
browser hides closed content, and cannot be defeated by the next change to
`::details-content`. The CSS rule stays as a second line of defence but is no
longer the mechanism. The regression test asserts _rendered text_, not the DOM —
the existing test would have passed either way, which is why this shipped.

**The request locale wins over the stored locale.** An assessment records the
locale it was taken in, and that is worth keeping: it says which language the
respondent answered in. It is not a statement about which language a later reader
wants. `/en/report/<id>` is an explicit request, and a document that ignores it
is simply broken.

**One figure, not two.** The savings section renders "Aktuell pro Jahr" and
"Entfällt mit diesem Plan" as two tiles carrying the _same number_, the second in
green. ADR-0003 forbids a net saving. A green number labelled "entfällt", set two
type sizes larger than the four caveats beneath it, is a net saving in everything
but the noun, and it is the figure that will be quoted. The exposure becomes one
figure with the second tile's meaning moved into prose beneath it.

**Phases renumber contiguously, and an empty phase says so.** A gap between
"Phase 0" and "Phase 2" is a question the document cannot answer, and the
numbering is a property of the rulepack the reader cannot see. Rendering the
empty slot explicitly — "Phase 1 — Schnelle Vorhaben: für diese Organisation
nicht belegt" — is better than renumbering, because for this audience an empty
phase is itself a finding.

**Fit criteria common to every recommendation are stated once, not tabulated.**
A matrix of criteria against categories was the reviewer's suggestion and is the
better artefact on screen; on A4 portrait with up to nine categories it is a
ten-column table that has to be rotated or abbreviated to fit, and this document
is judged on paper. Stating the shared criteria once above the cards and leaving
each card only what distinguishes it removes the same repetition and prints.

**The document gets its own type scale.** Today the report is `text-sm` and
`text-xs` throughout, with two points of size separating a numbered section from
a card title inside it. That is an app-shell scale applied to a twelve-page
document, and it is why section boundaries disappear when scrolling. The shell
keeps its scale; `.report-print` and the report view get a larger one, with the
section number set as a hanging figure rather than inline — which also fixes the
accessible name reading "1Zusammenfassung".

**Nothing is seeded.** (Decided as "marked or not seeded at all"; the second
half won, because marking a fabricated answer still leaves it in the payload
unless the respondent notices the mark, and the two mitigations the seeding was
guarding against — a wall of errors on arrival, and a category with nowhere to
show one — were both already solved elsewhere.) The wizard pre-fills
`criticality`, `pain` and `urgency` on every newly ticked category, and
`urgency: "later"` demotes that category in the roadmap. A tool that refuses to
fabricate a savings figure should not silently fabricate a Dringlichkeit — and
the "Angaben prüfen" step, which shows six of roughly thirty-five answers while
saying "Der Plan wird ausschließlich hieraus berechnet", makes it uncheckable.
Both halves are the same defect.

## What the review found that should not change

Recorded because a later pass will be tempted to touch these:

- The oklch token palette. Every real text pair clears 4.5:1, including the 12px
  `faint` tier on all three surfaces, without taking the large-text exemption.
- The landing page's plan excerpt. It argues the thesis by demonstration —
  phases, a "vorerst unverändert lassen", a struck-out candidate, a band rather
  than a number, and "Illustration mit erfundenen Angaben" beneath.
- The draft-rulepack notice above the report's first line. It costs the first
  impression and buys the remaining twelve pages.
- §8 and "Nicht berücksichtigt" in the method section. Naming what was not
  modelled is what earns a conservative reader.
- The mobile wizard's choice cards, and the reduced-motion discipline.

## Verification

- `pnpm check` and `pnpm build` green.
- `pnpm test:e2e` green, including the axe pass over both locales.
- The printed PDF: ruled-out candidates present in extracted text, page numbers
  on every sheet, and fewer sheets than before for the same report.
- `/en/report/<id>` contains no German — asserted by extending `locale.spec.ts`'s
  existing German-token scan to the report's rulepack prose, which currently
  only covers catalogue strings.
- The landing page's closing section at 1280 and 1600 with no crushed column.
- A wizard run where every seeded answer is visibly seeded, and step 6 lists
  every answer given.
