# Roadmap

## Release milestones

| Version    | Definition of done                                                                                                                                                                        |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **v0.1.0** | Clickable MVP: landing, six-step wizard, deterministic engine, nine-category rulepack, polished report view, Markdown export, print-ready HTML report, German complete with English wired |
| v0.2.0     | Improved scoring logic, stronger report quality, German/English polish, openDesk as a suite-level recommendation                                                                          |
| v0.3.0     | Saved sessions and profiles, richer organization modelling, server-side PDF generation                                                                                                    |
| v0.4.0     | Sector templates, stronger capacity guidance, deeper local-AI advisory                                                                                                                    |
| v1.0.0     | Stable production-ready planning tool for German SMEs and local public bodies                                                                                                             |

Tags are annotated. The package version stays `0.0.0` until v0.1.0 is tagged.

## v0.1.0 implementation phases

Each chunk is one reviewable commit, roughly 30 minutes of work.

### Phase 0 — Foundation

| #   | Chunk                                                                | Verify                                         | Status |
| --- | -------------------------------------------------------------------- | ---------------------------------------------- | ------ |
| 0.1 | Next.js 16, strict TypeScript, Tailwind v4, ESLint, Prettier, Vitest | `pnpm check` and `pnpm build` clean            | done   |
| 0.2 | README, CHANGELOG, CLAUDE.md, docs and plans skeleton, ADRs, license | Docs read coherently; no broken internal links | done   |
| 0.3 | Design tokens, app shell, next-intl bootstrap with `[locale]`        | `/de` and `/en` both render the shell          | done   |

### Phase 1 — Domain and rulepack

| #   | Chunk                                                              | Verify                                            |
| --- | ------------------------------------------------------------------ | ------------------------------------------------- |
| 1.1 | Domain enums, types, intake Zod schemas                            | Unit tests over valid and invalid intake fixtures |
| 1.2 | Rulepack schema, referential-integrity validator, version registry | Integrity test passes on an empty pack            |
| 1.3 | Categories and source tools, all nine categories                   | Every `commonIn` resolves to a valid org type     |
| 1.4 | Target tools: office/docs, file sharing                            | Every entry has `sources` and `lastReviewed`      |
| 1.5 | Target tools: chat/video, intranet/wiki                            | as above                                          |
| 1.6 | Target tools: project management, helpdesk                         | as above                                          |
| 1.7 | Target tools: forms/surveys, CRM, DMS/archive                      | as above; CRM and DMS marked `focused`            |
| 1.8 | Migration edges, prerequisites, blocker rules                      | Blocker rules tested against persona fixtures     |
| 1.9 | AI use cases, deployment postures, hardware matrix                 | Integrity test                                    |

### Phase 2 — Engine

| #   | Chunk                                                     | Verify                                           |
| --- | --------------------------------------------------------- | ------------------------------------------------ |
| 2.1 | Rationale infrastructure and stage 0 normalize            | Unit tests on derived values                     |
| 2.2 | Stage 1 readiness bands and cross-checks                  | Includes the self-hosting-without-Linux case     |
| 2.3 | Stage 2 candidate filtering, retained elimination reasons | One test per hard constraint                     |
| 2.4 | Stage 3 fit scoring and ecosystem coherence               | Coherence never overrides a hard mismatch        |
| 2.5 | Stage 4 migration difficulty with stepped seat pressure   | Monotonicity: more seats never lowers difficulty |
| 2.6 | Stage 5 sequencing, dependencies, "keep for now"          | Prerequisites never scheduled after dependants   |
| 2.7 | Stage 6 capacity, effort bands, pilot and support flags   | Weak-capacity persona produces gaps              |
| 2.8 | Stages 7–8 savings and AI lane; `runEngine` composition   | No currency in output; doc-QA deferral fires     |

### Phase 3 — Report document and wizard

| #   | Chunk                                                       | Verify                                             |
| --- | ----------------------------------------------------------- | -------------------------------------------------- |
| 3.1 | `PlanningReport` schema, composition, five persona fixtures | Determinism test: two runs are identical           |
| 3.2 | Wizard shell, stepper, autosave, per-step validation        | Refresh mid-wizard preserves answers               |
| 3.3 | Steps 1–2: organization and operating model                 | Invalid input blocks progress with German messages |
| 3.4 | Step 3: current stack with org-type-filtered defaults       | Category toggling and the "other" path work        |
| 3.5 | Step 4: per-category migration detail                       | All fields persist per category                    |
| 3.6 | Step 5 AI posture and step 6 review                         | Seat-divergence warning fires                      |
| 3.7 | Prisma and SQLite, `POST /api/assessments`                  | Report URL still loads after a restart             |

### Phase 4 — Report UI

| #   | Chunk                                                  | Verify                                           |
| --- | ------------------------------------------------------ | ------------------------------------------------ |
| 4.1 | Report route, layout, section navigation               | All persona fixtures render                      |
| 4.2 | CSS-only indicators and at-a-glance dashboard          | No client components in the tree                 |
| 4.3 | Sections 1–3: summary, advantages, savings             | Savings shows band, drivers, offsets, model note |
| 4.4 | Section 4: target stack and "considered and ruled out" | Elimination reasons visible and correct          |
| 4.5 | Section 5: migration roadmap                           | Phase order matches engine output                |
| 4.6 | Sections 6–7: capacity and local-AI lane               | Now/pilot/later reasoning is readable            |
| 4.7 | Sections 8–9: scalability outlook and next steps       | Rulepack version and review date shown           |

### Phase 5 — Export, polish, release

| #   | Chunk                                           | Verify                                       |
| --- | ----------------------------------------------- | -------------------------------------------- |
| 5.1 | Markdown renderer and download route            | Golden snapshots; pastes cleanly into a wiki |
| 5.2 | Print route, print CSS, cover page, page breaks | Manual print preview: clean A4, no cut cards |
| 5.3 | Landing page content                            | Reads calm and operational                   |
| 5.4 | Playwright smoke test and accessibility pass    | One spec green; no critical axe issues       |
| 5.5 | German copy review, English stubs complete      | No missing keys in either locale             |
| 5.6 | Docs pass, `v0.1.0` tag                         | `git describe` shows the tag                 |

## Deferred

Recorded here so that adding any of it is a deliberate decision, not drift.

Accounts and authentication, billing, saved profiles and revisions, assessment
comparison, external integrations or discovery, live migration tooling, procurement
workflow, vector database or RAG, agent frameworks, model hosting, chatbot UI,
multi-tenancy, compliance automation, server-side PDF, charting libraries,
PostgreSQL deployment, Docker image, public sample gallery, euro-denominated cost
calculators, and any LLM call in the planning path.

## Definition of done for v0.1.0

1. `pnpm check` green, including engine invariants and golden fixtures.
2. Playwright smoke green: wizard → report → Markdown → print.
3. A human completes intake for a 180-seat municipality in under 15 minutes, and
   the resulting brief answers every question listed in the README's "What lokal
   is" section.
4. The printed PDF is presentable to management without editing.
5. Removing the rulepack breaks the build — no recommendation is hardcoded in UI.
6. No currency amounts in generated output.
