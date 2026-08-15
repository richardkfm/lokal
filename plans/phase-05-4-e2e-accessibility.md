# Phase 5.4 — Playwright smoke test and accessibility pass

Roadmap row: `5.4 | Playwright smoke test and accessibility pass | One spec green; no
critical axe issues`.

## Why this phase exists

Every check that exists today runs on pure functions and fixtures. Nothing yet
proves that the four pieces actually connect in a browser: the wizard writes a
draft, posts it, the server persists it, the report route recomputes, and the two
export paths render. The v0.1.0 definition of done names that path explicitly —
"wizard → report → Markdown → print" — so it needs one test that walks it.

The accessibility half is not decoration for this audience. Public bodies in
Germany procure against BITV 2.0; a planning tool that argues for open,
sovereign software and then ships an unusable form loses the argument before
anyone reads the report.

## Scope

1. Playwright installed and configured for Chromium only, against `next build` +
   `next start` on a dedicated port and a dedicated SQLite file.
2. One smoke spec covering the whole path: landing → six wizard steps → submit →
   report → Markdown download → print route.
3. An axe-core pass over the four surfaces that ship: landing, wizard, report,
   print. Assert on serious and critical impacts.
4. CI job wired so both run on every pull request.
5. Docs updated in the same commit.

## Out of scope

- Multi-browser or mobile viewports. One engine proves the wiring; a matrix
  triples CI time for a tool with four pages.
- Visual regression snapshots. The print layout is verified by eye per 5.2.
- Component-level tests. The engine is already covered by unit tests, and the
  components are thin renderers over `PlanningReport`.

## Decisions

**Separate `pnpm test:e2e`, not part of `pnpm check`.** `pnpm check` is the fast
inner loop and must stay usable without a browser download or a build. CI runs
both.

**Vitest must not pick the specs up.** Vitest includes `**/*.test.ts`; Playwright
specs are named `*.spec.ts` under `tests/e2e/`, so the two suites cannot collide
even by accident.

**Drive the wizard through real labels, not test ids.** The intake is built out
of real `<fieldset>`, `<label>` and `<input>` elements. Clicking the label a user
would click means the smoke test fails if the form stops being a set of labelled
native controls. Options are addressed by their input's `name`/`value` rather
than by their German text, which repeats across groups; the accessible-name
guarantee is asserted separately and explicitly, per group.

**The seat-divergence warning is asserted, not avoided.** The spec drives one
category above the organization's seat count, confirms the review step raises the
notice and still allows submission, then corrects it. That warning is one of the
outputs CLAUDE.md says must never be dropped.

**Axe gets its own spec, seeded through the API.** The report and print pages
need a real assessment id, and creating one through the wizard costs a full
intake. The accessibility spec posts a persona payload to `POST /api/assessments`
instead of running the wizard a second time.

## Verification

- `pnpm test:e2e` green locally and in CI.
- `pnpm check` unchanged and still green.
- No serious or critical axe violations on any of the four surfaces.

## Outcome

Ten tests green. Three defects surfaced and were fixed as part of the pass.

1. **The detail step could not be completed with an empty "currently in use"
   field**, which its own hint invites. `currentTool` was required, the entry
   failed validation, and the field has nowhere to render an error — so the step
   silently refused to advance. An untouched field now means "nothing in use".
   Guarded by a unit test, since the fix is in a pure function.
2. **The repeated three-point questions had no programmatic label.** A heading
   rendered above a card row is a visual association only. They are nested
   `<fieldset>` elements now, and each category block is a named landmark.
3. **Two design tokens failed contrast.** `--color-faint` (3.3–3.6:1) and
   `--color-caution` (3.3–3.7:1) both carry small text. Both moved to 54%
   lightness, which also lines caution up with good and risk.

One decision changed on contact with reality: the wizard's _step index_ is not
persisted, only the draft, so a mid-wizard reload lands back on step one with
every answer intact. The test asserts that behaviour rather than the behaviour
originally assumed.

One flake source was fixed rather than retried: axe sampled colours
mid-transition, so the suite snaps animations to their end state before
measuring.
