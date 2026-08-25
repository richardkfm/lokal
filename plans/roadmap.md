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
| 1.1 | Domain enums, types, intake Zod schemas                            | Unit tests over valid and invalid intake fixtures | done |
| 1.2 | Rulepack schema, referential-integrity validator, version registry | Integrity test passes on an empty pack            | done |
| 1.3 | Categories and source tools, all nine categories                   | Every `commonIn` resolves to a valid org type     | done |
| 1.4 | Target tools: office/docs, file sharing                            | Every entry has `sources` and `lastReviewed`      | done |
| 1.5 | Target tools: chat/video, intranet/wiki                            | as above                                          | done |
| 1.6 | Target tools: project management, helpdesk                         | as above                                          | done |
| 1.7 | Target tools: forms/surveys, CRM, DMS/archive                      | as above; CRM and DMS marked `focused`            | done |
| 1.8 | Migration edges, prerequisites, blocker rules                      | Blocker rules tested against persona fixtures     | done |
| 1.9 | AI use cases, deployment postures, hardware matrix                 | Integrity test                                    | done |

### Phase 2 — Engine

| #   | Chunk                                                     | Verify                                           |
| --- | --------------------------------------------------------- | ------------------------------------------------ |
| 2.1 | Rationale infrastructure and stage 0 normalize            | Unit tests on derived values                     | done |
| 2.2 | Stage 1 readiness bands and cross-checks                  | Includes the self-hosting-without-Linux case     | done |
| 2.3 | Stage 2 candidate filtering, retained elimination reasons | One test per hard constraint                     | done |
| 2.4 | Stage 3 fit scoring and ecosystem coherence               | Coherence never overrides a hard mismatch        | done |
| 2.5 | Stage 4 migration difficulty with stepped seat pressure   | Monotonicity: more seats never lowers difficulty | done |
| 2.6 | Stage 5 sequencing, dependencies, "keep for now"          | Prerequisites never scheduled after dependants   | done |
| 2.7 | Stage 6 capacity, effort bands, pilot and support flags   | Weak-capacity persona produces gaps              | done |
| 2.8 | Stages 7–8 savings and AI lane; `runEngine` composition   | No currency in output; doc-QA deferral fires     | done |

### Phase 3 — Report document and wizard

| #   | Chunk                                                       | Verify                                             |
| --- | ----------------------------------------------------------- | -------------------------------------------------- |
| 3.1 | `PlanningReport` schema, composition, five persona fixtures | Determinism test: two runs are identical           | done |
| 3.2 | Wizard shell, stepper, autosave, per-step validation        | Refresh mid-wizard preserves answers               | done |
| 3.3 | Steps 1–2: organization and operating model                 | Invalid input blocks progress with German messages | done |
| 3.4 | Step 3: current stack with org-type-filtered defaults       | Category toggling and the "other" path work        | done |
| 3.5 | Step 4: per-category migration detail                       | All fields persist per category                    | done |
| 3.6 | Step 5 AI posture and step 6 review                         | Seat-divergence warning fires                      | done |
| 3.7 | Prisma and SQLite, `POST /api/assessments`                  | Report URL still loads after a restart             | done |

### Phase 4 — Report UI

| #   | Chunk                                                  | Verify                                           |
| --- | ------------------------------------------------------ | ------------------------------------------------ |
| 4.1 | Report route, layout, section navigation               | All persona fixtures render                      | done |
| 4.2 | CSS-only indicators and at-a-glance dashboard          | No client components in the tree                 | done |
| 4.3 | Sections 1–3: summary, advantages, savings             | Savings shows band, drivers, offsets, model note | done |
| 4.4 | Section 4: target stack and "considered and ruled out" | Elimination reasons visible and correct          | done |
| 4.5 | Section 5: migration roadmap                           | Phase order matches engine output                | done |
| 4.6 | Sections 6–7: capacity and local-AI lane               | Now/pilot/later reasoning is readable            | done |
| 4.7 | Sections 8–9: scalability outlook and next steps       | Rulepack version and review date shown           | done |

### Phase 5 — Export, polish, release

| #   | Chunk                                           | Verify                                                          |
| --- | ----------------------------------------------- | --------------------------------------------------------------- |
| 5.1 | Markdown renderer and download route            | Golden snapshots; pastes cleanly into a wiki                    | done |
| 5.2 | Print route, print CSS, cover page, page breaks | Manual print preview: clean A4, no cut cards                    | done |
| 5.3 | Landing page content                            | Reads calm and operational                                      | done |
| 5.4 | Playwright smoke test and accessibility pass    | One spec green; no critical axe issues                          | done |
| 5.5 | Visual identity, landing page, design tokens    | Landing sells the concept; axe clean; print chrome still hidden |
| 5.6 | German copy review, English stubs complete      | No missing keys in either locale                                |
| 5.7 | Docs pass, `v0.1.0` tag                         | `git describe` shows the tag                                    |

## Deferred

Recorded here so that adding any of it is a deliberate decision, not drift.

Accounts and authentication, billing, saved profiles and revisions, assessment
comparison, external integrations or discovery, live migration tooling, procurement
workflow, vector database or RAG, agent frameworks, model hosting, chatbot UI,
multi-tenancy, compliance automation, server-side PDF, charting libraries,
PostgreSQL deployment, public sample gallery, euro-denominated cost calculators,
and any LLM call in the planning path.

Docker image was on this list and was pulled forward on explicit request: a
self-hostable planning tool needs a self-hosting path simpler than "clone and
run pnpm build" for the municipalities and SMEs it targets. See `Dockerfile`,
`docker-compose.yml` and the README's "Docker" section.

Phase 5.5 (visual identity and landing page) was added to v0.1.0 rather than
deferred to v0.2.0, on explicit request. It is new scope and carries no matching
deletion, so it is recorded here deliberately. The reasoning: the milestone already
promises a "polished report view", and lokal's whole argument is that open,
self-hosted software is a credible choice — tagging an MVP that looks unfinished
and redesigning immediately afterwards would undercut that argument and waste the
tag. The report and wizard layouts stayed out of scope to keep the phase bounded.
See `plans/phase-05-5-design-pass.md`.

## Definition of done for v0.1.0

1. `pnpm check` green, including engine invariants and golden fixtures.
2. Playwright smoke green: wizard → report → Markdown → print.
3. A human completes intake for a 180-seat municipality in under 15 minutes, and
   the resulting brief answers every question listed in the README's "What lokal
   is" section.
4. The printed PDF is presentable to management without editing.
5. Removing the rulepack breaks the build — no recommendation is hardcoded in UI.
6. No currency amounts in generated output.
