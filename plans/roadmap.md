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
| 5.1 | Markdown renderer and download route            | Golden snapshots; pastes cleanly into a wiki                    | done                   |
| 5.2 | Print route, print CSS, cover page, page breaks | Manual print preview: clean A4, no cut cards                    | done                   |
| 5.3 | Landing page content                            | Reads calm and operational                                      | done                   |
| 5.4 | Playwright smoke test and accessibility pass    | One spec green; no critical axe issues                          | done                   |
| 5.5 | Visual identity, landing page, design tokens    | Landing sells the concept; axe clean; print chrome still hidden | done                   |
| 5.6 | German copy review, English stubs complete      | No missing keys in either locale                                | done                   |
| 5.7 | Docs pass, `v0.1.0` tag                         | `git describe` shows the tag                                    | docs done; tag pending |

### Phase 6 — Engagement

Added to v0.1.0 on explicit request; see the note under "Deferred" and
`plans/phase-06-engagement.md`.

| #   | Chunk                                                    | Verify                                                           | Status |
| --- | -------------------------------------------------------- | ---------------------------------------------------------------- | ------ |
| 6.1 | Phase plan, ADR-0003, roadmap amendments                 | Docs read coherently; DoD 6 restated                             | done   |
| 6.2 | Rulepack `v2026-09`: Euro-Office, list prices            | Integrity passes; `v2026-08` still registered                    | done   |
| 6.3 | Engine: subscription exposure in stage 7                 | Arithmetic tests; coverage gap reported; band unchanged          | done   |
| 6.4 | Report: figures with their basis, in all three renderers | No euro figure without plan, source and date                     | done   |
| 6.5 | Motion: path dots, rotating seal, cycling hero word      | Axe green; print preview shows no opacity-0 block                | done   |
| 6.6 | Expert contact from `LOKAL_EXPERT_*`                     | Absent unset, present set, non-fatal when malformed              | done   |
| 6.7 | Shorter German and English copy; e2e specs realigned     | No missing keys in either locale; smoke green                    | done   |
| 6.8 | Landing numbers section; docs and screenshots            | Landing states a sourced figure; README no longer contradicts it | done   |

## Deferred

Recorded here so that adding any of it is a deliberate decision, not drift.

Phase 8 (Entscheidungsvorlage) was added on explicit request after a review of a
live plan, and is likewise new scope. It carries four deliberate deferrals of its
own, recorded here so that adding any of them is a decision rather than drift:

- **A distribution catalogue for the client operating system.** Ubuntu LTS,
  openSUSE and Debian as scored target tools with fit reasons and ruled-out
  lists. The lane that ships in phase 8 answers _whether and when the desktop
  can move, and what blocks it_; it never names a distribution. Deferred to
  v0.4.0, and it is the reason the lane needs no product research to ship.
- **E-Mail und Groupware as a tenth category.** Exchange and Outlook are the
  strongest single tie to Microsoft for this audience, and no desktop plan is
  fully credible while mail sits on Exchange. Named here rather than quietly
  omitted, because a reader who sees an OS lane will ask about mail next.
- **Verzeichnis und Server-Betriebssystem.** Active Directory and Windows Server
  to Samba AD, LDAP or Keycloak. Today implied by the `identity-directory`
  prerequisite and never named as a migration with its own effort and risk.
- **Break-even, Amortisation, ROI, Payback — permanently.** Restated in
  [ADR-0004](../docs/adr/0004-declared-rates-for-the-cost-side.md). Phase 8 adds
  a cost column beside the exposure column and states in the document that the
  two are not subtractable. Every ingredient an amortisation figure needs is one
  of the costs lokal explicitly does not price.

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

Phase 6 (engagement) was likewise added on explicit request and is likewise new
scope without a matching deletion. It carries three items that were previously on
this list and are now deliberately off it:

- **Euro-denominated figures.** Reversed by ADR-0003, under six guardrails. lokal
  still has no cost calculator: it multiplies the user's own seat counts by a
  vendor's own published list price, cites it, dates it, and states its coverage.
  Net savings, ROI and payback stay deferred permanently.
- **An operator-configured expert contact.** Env-var driven, no account, no
  stored enquiry — so "accounts and authentication" stays deferred intact.
- **Rulepack `v2026-09`.** Adds Euro-Office, which shipped 1.0 on 2026-06-09,
  after `v2026-08` was authored.

See `plans/phase-06-engagement.md` and `docs/adr/0003-priced-exposure-from-published-list-prices.md`.

## Phase 7 — The report as a document (post-0.1.0)

A design and UX review of the running v0.1.0 build, plus three defects found by
driving the app rather than reading the tests. See
[`phase-07-document-pass.md`](phase-07-document-pass.md).

| #   | Chunk                                                                | Verify                                                          | Status |
| --- | -------------------------------------------------------------------- | --------------------------------------------------------------- | ------ |
| 7.0 | Intake names a product; identifiers resolved; connectors have a rail | Wizard-built report carries a euro figure; no raw ids           | done   |
| 7.1 | Print: ruled-out content on paper, pagination, page numbers          | Ruled-out candidates present in extracted PDF text              | done   |
| 7.2 | Request locale drives rulepack prose and dates; ICU plurals          | `/en` report contains no German                                 | done   |
| 7.3 | One exposure figure, honest seat count, every phase named            | No two tiles show the same amount; no gap in phase numbering    | done   |
| 7.4 | Document type scale; shared §4 criteria stated once; §2 earns it     | Section boundaries legible while scrolling; no repeated bullets | done   |
| 7.5 | Nothing pre-filled; full review step; error summary with focus       | A new category answers nothing; step 6 lists every answer       | done   |
| 7.6 | Landing tail layout; legal page links; copy duplication              | No crushed column at 1280 and 1600                              | done   |
| 7.7 | Severity not by colour alone; indicator contrast; target sizes       | Axe green; greyscale print still distinguishes severity         | done   |

Item 4 of the v0.1.0 definition of done — "the printed PDF is presentable to
management without editing" — is what this phase was for. 7.1 was a precondition
for it: the printed brief silently omitted one of the four outputs CLAUDE.md
names as proving the thesis.

The judgement itself is still open, and still a person's. What changed is that
the document is now worth judging: the ruled-out candidates are on paper, every
sheet carries a number, the type scale is a document's rather than an app's, no
figure states a saving lokal will not stand behind, and no machine identifier
reaches the reader.

## Before the tag

Everything in phases 0–6 is implemented, and the docs half of 5.7 is done: the
changelog carries a `0.1.0` section, `package.json` reads `0.1.0`, and no
document still describes the tag as forthcoming.

The tag itself is deliberately not applied yet. Three things stand in front of it
and none is code:

1. **The work is on a branch.** `v0.1.0` belongs on `main`, after the open pull
   request lands.
2. **Two definition-of-done items are human judgements**, 3 and 4 below. Nobody
   has yet sat down and completed a 180-seat municipal intake against a clock, or
   held the printed PDF and decided it can go to a management board unedited.
   Both are the kind of check this project exists to pass and neither can be
   automated into a green tick.
3. **A pushed tag is permanent in practice.** It is worth spending the fifteen
   minutes item 2 asks for before spending it.

Once those are settled: `git tag -a v0.1.0 -m "..."` on `main`, push, and 5.7's
own verification (`git describe`) is satisfied.

## Definition of done for v0.1.0

1. `pnpm check` green, including engine invariants and golden fixtures. **Met** —
   230 unit tests, plus 20 browser tests across both locales.
2. Playwright smoke green: wizard → report → Markdown → print. **Met.**
3. A human completes intake for a 180-seat municipality in under 15 minutes, and
   the resulting brief answers every question listed in the README's "What lokal
   is" section. **Open — needs a person, not a test.**
4. The printed PDF is presentable to management without editing. **Open — needs a
   person.** The print route is verified to render fully server-side, carry no
   site chrome and freeze every animation to a legible frame; whether it _reads_
   well enough is a judgement.
5. Removing the rulepack breaks the build — no recommendation is hardcoded in UI.
   **Met**, and now pinned by a test rather than by grepping.
6. Every euro figure in generated output is a declared seat count times a
   published vendor list price, shown with its source, plan and observation
   date. No net savings, ROI or payback figures anywhere (ADR-0003). **Met**, in
   both locales and on paper.

## Phase 8 — Der Plan als Entscheidungsvorlage (post-0.1.0)

Prompted by an IT lead reviewing a live plan and asking what they would hand to
their management with it. Three gaps came back — the operating system is not
modelled, the effort days have no reasoning and no calendar, and there is no
cost side — plus a fourth found in the running document: the report is stacked,
has no section navigation, and buries the one named human to call behind §9.

See [`phase-08-decision-brief.md`](phase-08-decision-brief.md) and
[ADR-0004](../docs/adr/0004-declared-rates-for-the-cost-side.md).

| #    | Chunk                                                                | Verify                                                                | Status |
| ---- | -------------------------------------------------------------------- | --------------------------------------------------------------------- | ------ |
| 8.1  | Phase plan, ADR-0004, roadmap deferrals, README and CLAUDE.md rule 4 | Docs read coherently; no broken internal links                        | done   |
| 8.2  | Intake: workplace block, optional rates, v1→v2 upgrade path          | A v1 payload still loads and still renders                            |        |
| 8.3  | Wizard: the new questions, nothing seeded, review step complete      | No missing keys in either locale; step 6 lists every answer           |        |
| 8.4  | Rulepack `v2026-10`: the client-OS lane as rules                     | Integrity passes; `v2026-08` and `v2026-09` still registered          |        |
| 8.5  | Engine: `bandFor` reasons and `effort.ts` work packages              | Packages sum exactly to the band; fixtures byte-identical             |        |
| 8.6  | Engine: `schedule.ts` calendar duration                              | Horizon monotone in days, inverse in capacity; the floor binds        |        |
| 8.7  | Engine: `workplace.ts` client-OS verdict                             | `windowsOnlyApps: many` always blocks, with a named reason            |        |
| 8.8  | Engine: `cost.ts` declared-rate cost                                 | No rate means no figure, never a zero; no net anywhere in the output  |        |
| 8.9  | Report: schema slices and the `decisionBrief` derivation             | Determinism test still green; risk ordering stable across two runs    |        |
| 8.10 | Report: §0, difficulty drivers, work packages, two money columns     | Drivers reach the page; neither money column in the "good" tone       |        |
| 8.11 | Report: the phase timeline, horizon replaces the phase-count tile    | Legible in greyscale at A4; at-a-glance still six tiles               |        |
| 8.12 | Report: section navigation, printed Inhalt, contact rail             | Rail absent from the printed PDF; print tree still has no client code |        |
| 8.13 | Markdown and print parity, docs pass, screenshots                    | Printed sheet count has not grown; Markdown carries §0                |        |
