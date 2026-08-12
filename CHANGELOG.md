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
