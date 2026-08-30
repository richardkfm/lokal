# Changelog

All notable changes to lokal are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
lokal adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Dates are ISO 8601.

## [Unreleased]

### Fixed

- **The intake can name a product.** The "currently in use" field was free text
  only, so every assessment recorded `{ kind: "other" }` and no report produced
  through the questionnaire ever reached a source tool in the rulepack. Vendor
  lock-in ratings, origin-specific migration edges and the whole priced-exposure
  section of 0.1.0 were unreachable outside test fixtures. The field is now a
  select over the rulepack's products for that category, with "Anderes System"
  keeping free text for anything not listed. Typed text is deliberately not
  matched against product names: attributing a euro figure to an organization
  that never named the product is what ADR-0003 exists to prevent.
- **Machine identifiers reaching the reader.** "Hoher Aufwand (very_high)",
  "Wartet auf file_sharing" and "Voraussetzung schaffen: identity-directory"
  were printed verbatim, on screen and on paper. Two separate families were
  involved: enum values, whose labels live in the message catalogue, and
  rulepack ids, whose labels live in the rulepack as `{ de, en }` objects and
  are therefore unreachable by a catalogue lookup. `localizeParams` now covers
  every parameter any stage passes an enum through, and takes the second family
  as labels supplied by the renderer from the report document itself. The two
  renderer call sites that bypassed it entirely go through it. A new test walks
  every rationale item in every persona's report and fails on any identifier
  that survives localization. One is knowingly left: a target tool's
  `ecosystem` has no label anywhere in the rulepack, so it renders as
  "Verbund (nextcloud)"; giving ecosystems a name means a new rulepack version
  and is recorded in the test rather than fixed silently.
- **Three numbers a reader stops at.** The savings section stated the exposure
  twice — the same amount, the second labelled "Entfällt mit diesem Plan" and
  set in green, which is a net saving in everything but the noun and is what
  ADR-0003 exists to forbid. It now states one figure, with what the roadmap
  removes from it as a sentence beneath. The at-a-glance card read "735 von 180
  insgesamt", a sum over categories in which a person in six areas is counted
  six times, and now says so. And the roadmap numbered its phases from the
  rulepack while filtering empty ones out, so the printed headings read 0, 2, 3
  with no way for a reader to resolve the gap; an unoccupied phase is now named,
  because for this audience it is itself a finding.
- **Counts agree with their nouns.** Fourteen messages interpolated a number
  beside a plural noun, so every report said "1 Bereiche sollten vorerst
  unverändert bleiben" in both languages. The cause was in the tests: they used
  a hand-written stand-in for next-intl that could not evaluate an ICU plural,
  so a message using one would have failed the suite. The stand-in is replaced
  by next-intl's own `createTranslator` with a throwing `onError`.
- **English reports served German prose.** The report view took its locale from
  the stored intake rather than the request, so `/en/report/<id>` returned
  German tool summaries, prerequisite labels, AI descriptions and scaling notes
  — every string sourced from the rulepack rather than the catalogue. The
  Markdown export keeps the stored locale, whose route carries no locale
  segment. Price observation dates now also render in the reader's convention
  rather than the rulepack's ISO storage form.
- **The printed brief omitted the candidates it ruled out.** The disclosure
  printed as a bare count: `print.css` overrode `display` on its children, and
  Chromium hides them through `::details-content`, which that cannot reach.
  "Considered and ruled out" is one of the four outputs CLAUDE.md names as
  proving the thesis. The print tree now opens the disclosure itself, the CSS
  gains a rule against the real mechanism, and the test asserts on rendered text
  rather than on the DOM. Also on paper: a running head and page numbers, and
  sections may now flow across a page boundary instead of being pushed whole.
- **The questionnaire answered three questions on the respondent's behalf.**
  Ticking a category pre-filled Betriebskritikalität, Leidensdruck and
  Dringlichkeit, visually identical to a real answer — and `urgency: "later"` is
  not a neutral middle, it demotes the category in the roadmap. The "Angaben
  prüfen" step then showed six of roughly thirty-five answers under copy saying
  the plan is computed solely from them, so the substitution could not be caught
  there either. Nothing is pre-filled now, and the review step lists every
  answer, grouped by the step that asked for it, each group editable.
- **Failed validation left the user nowhere to go.** Clicking "Weiter" on an
  incomplete step kept focus on the button, did not scroll, and showed two
  adjacent fields both reading "Pflichtfeld." with nothing naming them. There is
  now an error summary that takes focus and names each open question in the
  form's own words rather than the schema's. "Bitte füllen Sie diesen Schritt
  aus" appears only after an attempt, not on arrival.
- **The review step showed a tool id.** "microsoft-365-apps" where the form had
  said "Microsoft 365 (Word, Excel, PowerPoint)".

### Added

- Hints on all nine categories in step 3, with examples. "Dateiablage" versus
  "Dokumentenmanagement" versus "Intranet und Wissen" is a genuine question, and
  that step decides the shape of everything downstream.
- Step 3 states how many follow-up questions the selection commits to. Six
  categories is forty-two.
- "Von vorn beginnen" now confirms before discarding fifteen minutes of answers,
  and meets the 24px WCAG 2.5.8 target minimum.

### Fixed

- **The step connectors on the landing page.** They animated correctly while
  painting nothing: an unlayered `width: 100%` in `globals.css` beat the `w-10`
  utility meant to size them, and a percentage width in an indefinite grid track
  is zero. The stylesheet now sets only the 1px axis, `PathRail` requires the
  caller to size the other, and the rendered width is asserted in the browser.

## [0.1.0] – 2026-08-30

First working release: intake, engine, rulepack, report, Markdown export and a
print route, German complete and English complete alongside it.

### Added (phase 6 — engagement)

- **Priced subscription exposure.** The report now states what the current
  subscriptions cost and what the roadmap removes, computed as declared seats
  times a price the vendor publishes. Every figure carries its plan name,
  billing term, tax basis, source link and the date the price was read, and the
  report always states how many assessed areas carry a citable price. Never a
  net saving, an ROI or a payback figure. Reverses the euro half of CLAUDE.md
  rule 4 under six guardrails; see
  `docs/adr/0003-priced-exposure-from-published-list-prices.md`.
- **Rulepack `v2026-09`.** Adds Euro-Office — the AGPL office suite from the
  Nextcloud/IONOS-led European consortium, released 2026-06-09 — with its
  migration edges and a caution rule that keeps any young suite out of a large
  or business-critical rollout without a pilot. Also adds published list prices
  on source tools, grouped by subscription bundle so one Microsoft 365 contract
  is counted once rather than once per category. `v2026-08` stays registered and
  unchanged: released packs are immutable.
- **Motion.** A dot travelling the connectors between steps (landing, wizard
  progress, roadmap spine), a slowly rotating seal, and a headline word that
  cycles through the products organizations are actually leaving. CSS only, no
  library, no client component.
- **Expert contact.** Optional `LOKAL_EXPERT_*` environment variables put a named
  human on the landing page and at the end of every report, including the printed
  copy. Links only — no form, no stored enquiry, no mail server, no account.
- **`tests/e2e/print-and-motion.spec.ts`.** Asserts that nothing animated rests
  invisible under print media or reduced motion, and that no euro figure reaches
  the printed page without its basis.

### Changed (phase 6)

- The ESLint `no-currency-in-output` rule narrows from banning `€` and `EUR` to
  banning the glyph. Pure layers carry `{ amountCents, currency }`; formatting is
  a renderer's job.
- German and English copy shortened across the landing page, the wizard and the
  report, without weakening any caveat.
- Rationale parameters holding enum values are now resolved to labels in every
  renderer — the savings section previously printed `office_docs:` verbatim.
- `method.not_modelled.licence_prices` replaced by `negotiated_contract_terms`:
  lokal now models list prices, but still cannot see discounts or framework
  agreements.
- `/[locale]` renders dynamically rather than being statically prerendered, so
  `LOKAL_EXPERT_*` can be set at container start rather than at build time.

### Fixed (detail step)

- The detail step ("Angaben je Bereich") no longer shows raw Zod validation
  text (e.g. `Invalid option: expected one of "low"|"medium"|"high"`).
  Validation issues are now mapped to localized German/English messages.
- Validation errors across all wizard steps no longer appear before the user
  has tried to move on — a freshly shown step, or a freshly added category,
  stays quiet until "Weiter" is clicked once.

### Added (detail step)

- The "Betroffene Arbeitsplätze" (seats) field now defaults to the
  organization's total seat count and stays in sync with it until the user
  types an explicit value for that category.
- A newly added category starts with neutral criticality/pain/urgency
  defaults instead of a wall of unset fields.
- "Werte von … übernehmen" copies one category's ratings into another, and
  "Werte des ersten Bereichs für alle übernehmen" applies them to every
  category at once.
- A "X von Y Bereichen vollständig" progress indicator.
- Number keys 1-3 select the matching option in any three/four-point rating.

### Added

- Next.js 16 application scaffold with strict TypeScript, Tailwind CSS v4, ESLint,
  Prettier and Vitest.
- ESLint rules enforcing two architectural decisions: the engine, rulepack and
  report layers stay free of React, database, i18n and app imports; and no euro
  amounts may appear in generated output.
- Design tokens as CSS custom properties, with system font stacks so builds work
  offline.
- Project documentation: `README.md`, `CLAUDE.md`, `CHANGELOG.md`, architecture and
  domain notes under `docs/`, phase plans under `plans/`, and the first two
  architecture decision records.
- AGPL-3.0-only license.
- German/English routing via next-intl under `/[locale]`, with German as the
  default and source language. `/` redirects to `/de`; unknown locales return 404.
- Application shell: header with locale switch, footer, skip link.
- Message catalogs with a test that fails on structural drift, extra keys or empty
  values between locales.
- GitHub Actions workflow running format, lint, typecheck, tests and build on every
  pull request.

### Added (phase 1)

- Domain vocabulary, intake schemas and the rationale model, with types inferred
  from Zod schemas so validation and types cannot drift.
- Rulepack schema requiring a checkable source and review date on every entry
  that makes a claim about a real product, plus a referential-integrity validator
  that fails the build on broken cross-references or overstated ratings.
- Rulepack `v2026-08`: nine categories, 29 source tools, 24 target tools,
  migration edges, prerequisites, blocker rules and the local-AI catalog.
  CRM and DMS/archive are marked as narrower coverage rather than implying the
  same research depth as the core seven.
- Every rule entry ships as `draft` until a human has verified it against its
  sources; the report will state this.

### Added (phases 2–5)

- Nine-stage planning engine: normalization, readiness bands with cross-checks,
  candidate filtering that retains elimination reasons, fit scoring with a bounded
  ecosystem-coherence pass, migration difficulty, phase sequencing under
  dependency and change-capacity constraints, capacity confrontation, qualitative
  savings outlook and the local-AI lane. Pure and deterministic throughout.
- `PlanningReport`: a versioned, validated JSON document that is the only contract
  between the engine and every renderer.
- Assessment persistence in SQLite, with reports recomputed on every render rather
  than stored.
- Six-step intake wizard with localStorage autosave, per-step validation and a
  review step that raises data-quality warnings without blocking submission.
- Report view with an at-a-glance summary and nine sections, rendered fully
  server-side with CSS-only indicators.
- Markdown export and a print-optimized route with A4 print styles.
- Landing page stating plainly what lokal is and what it is not.
- Five persona fixtures spanning association, school, municipality, utility and SME.

### Fixed

- Sequencing scheduled a migration before the one providing its prerequisite, so a
  plan could switch on chat before the platform it runs on existed.
- Replacing a cloud office suite with a locally installed one silently dropped
  real-time co-editing; it now raises a caution.
- AI readiness no longer lets organizational maturity mask the absence of any
  suitable hardware.

### Added (phase 5.5)

- Visual identity. The `>lokal` wordmark sets a shell prompt in JetBrains Mono;
  the same mark opens every terminal block on the site. It is `aria-hidden`, so
  the link's accessible name stays "lokal" rather than "greater-than lokal".
- Self-hosted typefaces: Inter for UI, JetBrains Mono for the wordmark and code,
  loaded through `next/font/local` from two committed woff2 files (88 KB total,
  both SIL OFL 1.1). `next/font/google` was rejected because it fetches at build
  time and would break the offline and air-gapped builds this project promises.
  The system stacks remain as fallback. Provenance, subsetting and licensing in
  `src/app/fonts/README.md`.
- Design tokens for elevation, radii and a terminal surface, plus a single
  `:focus-visible` ring replacing focus styling that was repeated ad hoc across
  the form primitives. `prefers-reduced-motion` is now honoured.
- The landing page rebuilt as a nine-section narrative. The section carrying the
  argument is a labelled excerpt of a plan — readiness, a phased roadmap, a
  "keep for now" verdict and a candidate ruled out with its reason — built from
  the report's own indicators. Showing the sequence is a better argument than
  asserting that lokal is not an alternatives finder.
- Terminal code blocks (`src/components/ui/terminal.tsx`). The self-hosting
  section shows the three commands from the README's quick start, verified to
  match it. The prompt is CSS generated content, so it is neither announced by a
  screen reader nor carried into the clipboard with a copied command.
- A real site header and footer: sticky navigation, and a footer that names the
  licence, the source and the rulepack version behind the recommendations.
- An ambient hero background: a blueprint grid and two soft washes on four
  deliberately non-harmonic periods (37s, 53s, 61s, 79s), so the composite has
  no common cycle and never visibly repeats. Only compositor-friendly properties
  are animated — no `filter: blur()`, which would repaint a large area every
  frame on hardware a good part of this audience is still running. Worst-case
  text contrast across the whole cycle is 6.51:1 against a 4.5:1 requirement,
  and `prefers-reduced-motion` removes the animations entirely.
- Scroll reveals across the landing sections, driven by `animation-timeline:
view()` — CSS reading scroll position directly, so no observer, no hook and no
  client component enters a tree the print route shares. Grid items each carry
  their own timeline, so rows stagger from the items' real positions rather than
  from tuned per-child delays.

### Changed (phase 5.5)

- The "what lokal is not" section is gone from the landing page. Four cards of
  negative framing read as defensive, and three of the four claims were already
  made positively elsewhere — the plan excerpt opens by saying the output is a
  sequence rather than a list of alternatives, the trust strip and the "how it
  works" proof line both carry "no language model", and the footer carries the
  advice disclaimer. The fourth, savings as a band with no figure attached, now
  appears in the excerpt as the report itself states it. Showing beats telling,
  and none of the report-side guarantees in CLAUDE.md are affected.
- The smoke test used to pin one sentence of that section's copy as the guard
  against lokal becoming an alternatives directory. It now asserts against what
  the page shows instead: a phased sequence, a "keep for now" verdict, a
  candidate struck out, and savings without figures. A directory cannot produce
  any of the four, so the guarantee is stronger than the sentence it replaces.
- The plan excerpt is a labelled region, so a screen reader hears where the
  example starts and stops rather than meeting it as unannounced prose.

### Fixed (phase 5.5)

- `print.css` hid site chrome with `header[class*="border-b"]:has(nav)`, keyed to
  a Tailwind class. Any restyle of the header would have started printing site
  navigation onto a report — silently, with no test covering it. Chrome now marks
  itself with `data-site-chrome`, and sticky positioning and backdrop filters are
  neutralised for paper.
- Terminal blocks invert to the ink-safe palette when printed, rather than
  putting a full-bleed black rectangle on the page.
- Printing the landing page produced mostly blank pages once scroll reveals
  landed: paper has no scroll position, so a `view()` timeline never advances
  and every revealed block stayed at opacity 0. Reveals are now switched off
  under `@media print`. The reduced-motion guard does not cover this — a visitor
  can prefer motion and still hit Print.
- The accessibility suite snapped animations with `Animation.finish()` before
  sampling colours, which throws `InvalidStateError` on an animation that never
  ends — so the first looping background on any page would have failed the axe
  run rather than the page. Infinite animations are now paused at a fixed time,
  which is the same determinism guarantee the helper existed for.

### Added (Docker)

- Docker support: a multi-stage `Dockerfile` producing a minimal, non-root
  runtime image via Next's `output: "standalone"`, plus `docker-compose.yml`
  running Prisma migrations as a one-off step against a persistent named
  volume before the app starts. Documented under "Docker" in `README.md`,
  covering prerequisites, configuration, updating, backups, stopping and
  removing, running without Compose, and troubleshooting. Pulled forward
  from the roadmap's deferred list on explicit request — see
  `plans/roadmap.md`.

### Added (phase 5.4)

- Playwright end-to-end suite, run with `pnpm test:e2e` as its own CI job. One
  smoke path — landing, six-step wizard, submit, report, Markdown export, print
  route — plus assertions that the mandated planning outputs ("considered and
  ruled out", "keep for now") reach the page, that data-quality warnings warn
  without blocking, and that no euro amount appears in any rendered output.
- The print route is exercised with JavaScript disabled, which is what now
  enforces the ADR-0002 constraint that its tree carries no client components.
- Accessibility pass with axe-core over the landing page, wizard, report and
  print route against WCAG 2.1 A and AA. Serious and critical findings fail the
  build; lesser ones are attached to the run. Keyboard operability and group
  labelling are asserted separately, since automated rules cannot see them.
- `docs/testing.md` describing the three test layers, where the accessibility bar
  sits and why, and the two sources of flake handled explicitly.

### Fixed (phase 5.4)

- The per-category detail step could not be completed if the "currently in use"
  field was left empty, which its own hint invites: the entry failed validation
  on a field with nowhere to show an error, so the step refused to advance with
  no explanation. An untouched field now means "nothing in use", the same as one
  typed into and cleared.
- The repeated three-point questions in the operating and detail steps had a
  visual heading but no programmatic label, leaving a screen reader with bare
  "niedrig / mittel / hoch" options. They are labelled groups now, and each
  category block in the detail step is a named landmark.
- `--color-faint` and `--color-caution` did not meet the 4.5:1 contrast minimum
  for the small text they carry. Both moved to 54% lightness.
