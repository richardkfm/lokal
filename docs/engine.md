# Planning engine

The engine converts a validated `AssessmentInput` into a `PlanningReport`. It is a
pipeline of pure functions: typed input in, typed output plus `RationaleItem[]`
out. Nothing is hidden in a component, and no stage reaches for a database, a
network call or a language model.

> This document describes the intended design. Sections are filled in with concrete
> weights and thresholds as each stage lands in phase 2.

## Rationale is a first-class output

Every stage emits `RationaleItem`s:

```ts
{
  code: "rationale.identity.no_sso_before_groupware",  // stable i18n key
  severity: "caution",
  params: { seats: 180 },
  evidence: [{ field: "operating.identityMaturity", value: "low" }],
}
```

`evidence` points back at the intake fields that caused the finding. This is what
lets the report answer "why is this in phase 3?" with the user's own answers, and
what makes two runs comparable. Codes are never localized sentences — renderers
translate them.

## Stages

### 0 — Normalize

Validates input and derives facts used everywhere downstream: seat weight
(log-scaled seat pressure), sovereignty demand, department spread, and which
categories were assessed. A category absent from the intake is reported as _not
assessed_, never as _nothing to do_.

### 1 — Readiness profile

Five bands, each 0–100 with a label and its contributing drivers: operations
capability, change capacity, identity readiness, support need, AI readiness.

Cross-checks fire here. The important one: a stated preference for self-hosting
combined with no Linux capability produces a caution and shifts later hosting
weighting toward managed EU hosting. This stage is what produces "where are we
underprepared".

### 2 — Candidate filtering

Hard constraints eliminate candidates before any scoring: German-language
requirement, vendor-support expectation, hosting mode availability, and seat
scalability.

**Elimination reasons are retained,** not discarded. The report shows "considered
and ruled out, because…". It is cheap to keep and it visibly separates lokal from a
recommendation prompt.

### 3 — Fit scoring and stack coherence

Weighted scoring over sovereignty, maturity, German market presence, public-sector
fit (weighted only for public-sector organizations), German UI quality, hosting-mode
match, an operations-load penalty scaled by the organization's capability, and a
training-load penalty scaled by training sensitivity and seat weight.

Then a coherence pass: candidates sharing an ecosystem already selected elsewhere
get a bounded bonus. The bonus is capped so coherence can never override a hard
mismatch.

Output per category: one primary, up to two backups, each with fit rationale,
hosting fit, support and maturity notes, sovereignty level and scalability notes —
plus the elimination list.

### 4 — Migration difficulty

Base complexity, adjusted by the source-to-target edge, seat pressure, criticality,
identity gap and training sensitivity, relieved by operations capability. Clamped
and labelled.

Seat pressure is stepped, not linear: the jump happens at covering a whole
workforce, not at each additional user.

### 5 — Sequencing

Value (pain, urgency, lock-in concern) against cost (difficulty, criticality),
placed into five phases: prerequisites, quick wins, moderate migrations,
complex/high-dependency, then optimization and local AI.

Constraints applied after scoring:

- A category never precedes its prerequisites.
- At most _N_ high-criticality migrations per phase, where _N_ scales with change
  capacity (weak change capacity means one).
- Items with poor coexistence are isolated.

Categories that score badly everywhere are marked **"keep for now"** with a
re-evaluation trigger. That is the "what can stay" answer, and it is a first-class
output rather than a gap.

### 6 — Capacity

Effort bands per migration, seat-scaled, summed per phase and compared against the
organization's declared admin capacity. Produces capacity gaps, "pilot first"
recommendations, external-support flags and per-phase training load.

All figures are ranges, labelled as planning estimates. They are not quotes.

### 7 — Savings outlook

Two things, in this order.

**The band** — low, moderate or strong — derived from licence exposure removed,
hosting-model change and support-model change, offset by migration effort and
training load, including the window where costs temporarily rise. Qualitative,
and unchanged by anything below.

**Priced subscription exposure** (`exposure.ts`), the only place lokal turns
anything into money. The arithmetic is deliberately trivial: seats the user
declared, times a price the vendor published, times twelve. There is no pricing
model and no way to express one — see
[ADR-0003](adr/0003-priced-exposure-from-published-list-prices.md).

Three rules make the figure trustworthy rather than merely present:

- **One subscription is counted once.** Source tools sold together share a
  `bundleId`, and the stage takes the dearest plan and the largest seat count in
  the group. Without this, an organization listing Microsoft 365 under office,
  files, chat, intranet and forms would have one invoice counted five times.
- **A subscription is only "avoided" once the roadmap replaces everything on
  it.** Migrating office documents while chat stays on the same contract does
  not end the contract. This is also the more useful planning output: it names
  the remaining service standing between the organization and a cancellation.
- **Coverage is always reported.** A stack of tools that publish no citable euro
  price returns `null`; a partly-priced one says how partial it is.

Amounts are integers in minor units with a currency code. The `€` glyph in
engine, rulepack or report code is a lint error, because a hand-formatted amount
is one that has escaped the plan name, source and date that make it checkable.

### 8 — AI lane

Per selected use case: now, pilot or later. Driven by hardware profile against the
use case's minimum, data sensitivity against deployment posture, AI readiness, and
prerequisite content sources.

One non-obvious dependency worth keeping: internal document Q&A is downgraded when
no document store or file-sharing target is planned before the final phase. There
is nothing to ask questions of yet.

### 9 — Compose

Assembles `PlanningReport`, attaching engine version, rulepack version, generation
timestamp and the full rationale index.

## Invariants

Asserted in tests, not just intended:

- Difficulty is monotone in seats and in criticality.
- Prerequisites never follow the categories that depend on them.
- Every recommendation carries at least one rationale item.
- Output contains no currency amounts.
- Running the engine twice on one fixture produces identical output.

## Weights

Scoring weights live in one module with documented reasoning. Golden persona
fixtures make any weight change visible in review — that is the point of them.
