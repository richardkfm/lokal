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
