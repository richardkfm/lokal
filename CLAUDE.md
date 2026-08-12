@AGENTS.md

# lokal — project memory

## What lokal is

A Germany-first planning tool that helps SMEs, municipalities, district offices,
schools, public utilities and associations move from proprietary software toward
open-source workplace tools, sovereign hosting and realistic local AI.

Its unit of value is a **plan**, not a list: a target stack, a sequenced migration
roadmap, capacity and readiness findings, a qualitative savings outlook, an AI-lane
recommendation, and a stakeholder-ready brief.

## The rule that governs every other decision

**lokal is not a generic alternatives finder.** A single chatbot turn can already
suggest replacement tools. If a change makes the output more like a list and less
like a plan, reject it.

Concretely, these outputs are what prove the thesis and must not be dropped or
weakened:

- **"keep for now"** verdicts — what the organization should _not_ migrate yet
- **"considered and ruled out"** — candidates eliminated, with the reason
- **capacity gaps** — where declared admin capacity does not cover the plan
- **AI "not yet"** — use cases deferred, with the reason they do not fit today

## Architecture boundaries

Enforced in `eslint.config.mjs`, not by convention:

1. `src/engine/**`, `src/rulepack/**` and `src/report/**` are pure. No React, no
   Prisma, no next-intl, no imports from `src/app/**`. This is what makes the
   engine testable with plain fixtures and its output reproducible.
2. The engine returns **rationale codes with parameters**, never user-facing
   sentences. Localization happens in renderers. This keeps the engine pure and
   makes DE-first/EN-ready cheap.
3. The print route (`/report/[id]/print`) renders **fully server-side**, with zero
   client components in the content tree. This single constraint is what makes
   server-side PDF (v0.3.0) a bolt-on instead of a rewrite. Do not break it.
4. No euro amounts anywhere in output. Savings are qualitative bands with named
   drivers. Fabricated precision is the fastest way to lose this audience.
5. The report is **never persisted**. Only intake answers plus the rulepack version
   are stored; the report is recomputed on every render. Storing derived data is
   how a planning tool starts lying.

## Data flow

```
intake → NormalizedAssessment → pure engine stages → PlanningReport (typed JSON)
                                                            │
                        ┌───────────────────────────────────┼──────────────┐
                        ▼                                   ▼              ▼
                 report view (screen)              toMarkdown()      /print route
```

`PlanningReport` is the only contract between the engine and every renderer. New
output formats are renderers over that document, never re-derivations.

## No LLM in the critical path

Recommendations, sequencing and scores come from explicit rules and structured
inputs. An LLM may later help polish prose in an already-structured section, or
help a human author draft rulepack entries offline for review. It may never
produce recommendations, sequencing or scores.

## Rulepack rules

- Rules live in TypeScript source under `src/rulepack/<version>/`, not database
  seeds. Type-checked, diff-reviewable, testable.
- Every entry carries `lastReviewed` (ISO date) and non-empty `sources`. Unsourced
  claims about a real product do not ship — wrong claims about Nextcloud or Zammad
  destroy trust with exactly the audience lokal targets.
- Rate conservatively. When unsure, say so in the report rather than guessing.
- Compliance (GoBD, retention, archival law) is framed as "verify with your own
  advisors". lokal never makes a compliance claim.

## Coding conventions

- TypeScript strict, `noUncheckedIndexedAccess` on. No `any`; use `unknown` and
  narrow.
- Zod at every edge: intake, rulepack, report document. One validation vocabulary.
- Engine stages are pure functions: typed input → typed output + `RationaleItem[]`.
  Nothing hidden in a component.
- Report components take exactly their typed slice of `PlanningReport` — never the
  whole document, never the raw assessment.
- Indicators are CSS-only (meters, bars, badges). No charting library: canvas does
  not print, and it is weight this project does not need.
- German is the source language. English message keys exist and stay in sync.

## Working rules

- **Plan first** for non-trivial changes: write `plans/phase-XX-*.md` before code.
- **Keep the MVP tight**: new scope requires a matching deletion or an explicit
  deferral recorded in `plans/roadmap.md`.
- **Small coherent phases**: one reviewable commit per chunk, roughly 30 minutes
  of work.
- **Docs travel with code**: update `README.md`, `CHANGELOG.md` and the relevant
  `docs/` page in the same commit as the change they describe.
- Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `test:`).

## Verification

`pnpm check` runs format, lint, typecheck and tests. Before calling a phase done,
also confirm the phase's stated check in `plans/roadmap.md`.
