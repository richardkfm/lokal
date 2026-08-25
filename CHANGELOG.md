# Changelog

All notable changes to lokal are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
lokal adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Dates are ISO 8601.

## [Unreleased]

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

### Fixed (phase 5.5)

- `print.css` hid site chrome with `header[class*="border-b"]:has(nav)`, keyed to
  a Tailwind class. Any restyle of the header would have started printing site
  navigation onto a report — silently, with no test covering it. Chrome now marks
  itself with `data-site-chrome`, and sticky positioning and backdrop filters are
  neutralised for paper.
- Terminal blocks invert to the ink-safe palette when printed, rather than
  putting a full-bleed black rectangle on the page.

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
