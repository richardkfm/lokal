# Architecture

This is the maintained description of how lokal is built. It is kept short on
purpose; details that change often live next to the code.

## The commitment everything follows from

```
intake  →  NormalizedAssessment  →  pure engine stages  →  PlanningReport (typed JSON)
                                                                   │
                              ┌────────────────────────────────────┼────────────────┐
                              ▼                                    ▼                ▼
                      report view (screen)                  toMarkdown()      /print route
                                                                         (→ server PDF, v0.3.0)
```

`PlanningReport` is a versioned, Zod-validated JSON document. It is the **only**
contract between the engine and every renderer.

Consequences, all deliberate:

- The engine is testable with plain fixtures — no React, no database, no network.
- New output formats are renderers over the same document, never re-derivations.
- The report is **never persisted**. Only intake answers plus `rulepackVersion` are
  stored; the report is recomputed on every render. Storing derived data is how a
  planning tool starts lying.
- The engine emits **rationale codes with parameters**, never localized sentences.
  Localization happens in renderers. This keeps the engine pure and makes
  German-first, English-ready cheap.

## Layers

| Path             | Responsibility                                          | May import            |
| ---------------- | ------------------------------------------------------- | --------------------- |
| `src/domain`     | Shared vocabulary, intake types, Zod schemas            | zod                   |
| `src/rulepack`   | Versioned rule data as TypeScript source                | domain, zod           |
| `src/engine`     | Pure scoring, sequencing, capacity, savings, AI lane    | domain, rulepack, zod |
| `src/report`     | `PlanningReport` schema, composition, Markdown renderer | domain, engine, zod   |
| `src/components` | React components; report sections take typed slices     | anything              |
| `src/app`        | Routes, wizard host, API handlers                       | anything              |
| `src/lib`        | Database access, i18n wiring, small utilities           | anything              |

The first four rows are enforced by `no-restricted-imports` in
`eslint.config.mjs`. They are the reason the engine can be trusted.

## Engine stages

Each stage is a pure function returning typed output plus `RationaleItem[]`.

| Stage        | Produces                                                           |
| ------------ | ------------------------------------------------------------------ |
| 0 normalize  | Derived facts: seat weight, sovereignty demand, covered categories |
| 1 readiness  | Five capability bands, plus cross-checks that surface gaps         |
| 2 candidates | Hard-constraint filtering, **retaining elimination reasons**       |
| 3 fit        | Weighted scoring, ecosystem coherence pass, primary + backups      |
| 4 difficulty | Migration difficulty per category, stepped by seat pressure        |
| 5 sequencing | Phases 0–4 under dependency and change-capacity constraints        |
| 6 capacity   | Effort bands vs. declared capacity; pilot and support flags        |
| 7 savings    | Qualitative band with drivers and offsets — never euro amounts     |
| 8 AI lane    | Per use case: now / pilot / later, with deployment posture         |
| 9 compose    | `PlanningReport` with versions, timestamp and rationale index      |

Details and weights: [`engine.md`](engine.md).

## Persistence

One table. `Assessment` stores the validated intake payload, the locale, the
schema version and the rulepack version. Report generation is
`load → validate → runEngine → render`.

If a stored `rulepackVersion` no longer exists, the report renders with the current
pack and shows a banner saying the underlying rules changed since the assessment
was taken.

SQLite to PostgreSQL is a provider swap plus `Json` → `Jsonb`. There is no query
surface to port.

## Report and export

Information architecture, component structure and print strategy:
[`report.md`](report.md).

The print route must render fully server-side — see
[ADR-0002](adr/0002-print-first-pdf.md).

## Decisions

- [ADR-0001: No LLM in the critical path](adr/0001-no-llm-in-the-critical-path.md)
- [ADR-0002: Print-optimized HTML before server-side PDF](adr/0002-print-first-pdf.md)
