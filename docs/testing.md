# Testing and accessibility

Three layers, each answering a question the others cannot.

| Layer            | Runs with       | Answers                                                                |
| ---------------- | --------------- | ---------------------------------------------------------------------- |
| Unit and fixture | `pnpm test`     | Do the rules, the engine and the renderers produce the right document? |
| End-to-end smoke | `pnpm test:e2e` | Are the pieces actually wired to each other in a browser?              |
| Accessibility    | `pnpm test:e2e` | Can the people this tool is for operate it?                            |
| Print and motion | `pnpm test:e2e` | Does anything animated rest invisible on paper?                        |
| Locale           | `pnpm test:e2e` | Is the English build in English, accessible names included?            |

`pnpm check` runs format, lint, typecheck and the first layer. It deliberately
does not run the browser suite: the inner loop has to stay usable without a
browser download or a production build. CI runs both, as two jobs.

## What the unit layer covers

The engine, the rulepack and the report renderers are pure functions over typed
inputs, so almost everything is testable without a framework: rulepack
referential integrity, per-stage engine invariants (more seats never lower
difficulty, prerequisites never scheduled after their dependants), five persona
fixtures rendered end to end, message-catalog structure, and the Markdown golden
snapshots.

Vitest collects `*.test.ts`. Playwright collects `*.spec.ts`. The two suites
share the `tests/` tree and cannot pick up each other's files.

Several suites exist because of bugs that shipped rather than bugs that were
imagined, which is worth knowing before deciding any of them is optional.
`print-and-motion.spec.ts` follows a scroll-driven animation that printed the
landing page nearly blank; it asserts that every animated element rests on a
legible frame under print media and reduced motion, and — after a second
shipped bug — that the step connectors are actually wide enough to show the dot
travelling them. `locale.spec.ts` follows two German accessible names that
reached the English report — invisible on screen, and invisible to axe, which
has no opinion about which language a valid accessible name is in.
`report/params.test.ts` follows "Hoher Aufwand (very_high)" reaching the printed
brief: it renders every persona in German and fails on any enum value that
survives as a bare word, which catches both a missing entry in the resolver
table and a renderer that forgets to call it.

## What the smoke test covers

One path, the one no unit test can reach: landing → six-step wizard → submit →
report → Markdown → print. It fills the wizard the way a person does, clicking
real labels attached to real inputs, so the test fails if the form stops being a
set of labelled native controls.

Three things it asserts that are product decisions rather than mechanics:

- **The mandated outputs are on the page.** "Considered and ruled out" and
  "keep for now" are two of the four outputs that make this a plan rather than a
  list ([CLAUDE.md](../CLAUDE.md)). The intake in the spec is chosen to produce
  both, so a change that quietly drops either one turns the suite red.
- **The data-quality warning warns without blocking.** A category declaring more
  seats than the whole organization raises a notice and still submits — the
  respondent may well be right, and lokal is not in a position to overrule them.
- **The priced figures the intake earns, with their basis.** Screen, Markdown
  and print output are each scanned for a euro amount, for the calculation basis
  beside it, and for the claims ADR-0003 forbids (ROI, Amortisation). This
  assertion used to be its own opposite — "no euro amounts anywhere", item 6 of
  the original definition of done — and it stayed green for a whole release
  after ADR-0003 replaced that rule, because no report the wizard could produce
  ever reached the priced path. Naming a real product in the intake is what
  makes the assertion mean something.

The print route is checked in a context with **JavaScript disabled**. It has to
render whole without it, because it has no client components by design
([ADR-0002](adr/0002-print-first-pdf.md)) and that is what makes server-side PDF
a later addition rather than a second implementation. A stray `"use client"` in
that tree fails this test rather than being discovered in v0.3.0.

## The accessibility bar

axe-core runs over all four surfaces that ship — landing, wizard, report, print
— against **WCAG 2.1 A and AA**, which is the ruleset BITV 2.0 refers to.

**Serious and critical impacts fail the build. Minor and moderate ones are
attached to the run but do not.** A hard gate at every level becomes a
suppression list, and a suppression list is worse than no gate.

This is not decoration for this audience. German public bodies procure against
BITV 2.0. A tool that argues for open, sovereign software while shipping a form
nobody can operate with a keyboard has lost the argument before anyone reads the
plan it produced.

Two things beyond the automated rules are asserted directly, because axe cannot
see them:

- Every repeated radio group **names the question it answers**. Steps two and
  four ask "niedrig / mittel / hoch" up to five times on one page; without a
  group label those options mean nothing on their own.
- The wizard is **operable by keyboard alone** — skip link visible on focus,
  space to select, arrow keys within a group.

### Findings from the first pass

The pass changed two design tokens rather than patching components:

- `--color-faint` was 62% lightness and reached only 3.3–3.6:1. It carries small
  print — captions, dates, seat counts — none of which qualifies for the
  large-text exemption, so it moved to 54%.
- `--color-caution` was the same, and it is used for text on its own tinted
  panel as well as for bar fills. It moved to 54%, which also lines it up with
  `--color-good` and `--color-risk`.

It also found one thing that was not a contrast problem: the radio groups in
steps two and four had a visual heading and no programmatic label at all. They
are nested `<fieldset>` elements now.

## Determinism

Two sources of flake are handled explicitly rather than by retrying:

- **Colour transitions.** The stepper and the choice cards animate their colours,
  and axe samples whatever colour it finds at that instant — mid-transition that
  is a value no user ever sees. The suite snaps animations to their end state
  before measuring.
- **Shared SQLite.** Both specs write to the same file, so the browser suite runs
  with one worker, the same reason `vitest.config.mts` disables file
  parallelism.
