# ADR-0001: No LLM in the critical path

- Status: accepted
- Date: 2026-08-12

## Context

lokal recommends target software, sequences migrations and estimates capacity for
organizations that will present its output to management, councils and procurement
stakeholders. The obvious implementation is to prompt a language model with the
intake answers and render the prose it returns.

That approach fails on four counts specific to this product:

1. **It is replaceable.** If the value is generated prose, a user can get the same
   thing by pasting their situation into any chat interface. The product would have
   no reason to exist.
2. **It is not reproducible.** Two runs a month apart would differ for reasons the
   user cannot inspect. A planning document that changes when nothing changed
   cannot be used as a reference in a decision process.
3. **It is not traceable.** A department head asking "why is our helpdesk migration
   in phase 3?" needs an answer grounded in their own inputs, not a paraphrase.
4. **It fabricates.** The failure mode of generated prose is confident precision —
   invented euro savings, invented adoption numbers, invented compliance claims —
   in exactly the areas where this audience is least able to absorb an error.

## Decision

Recommendations, sequencing, difficulty, capacity, savings bands and the AI lane
are produced by explicit rules over structured input. No language model is called
while producing a plan.

The engine is a pipeline of pure functions. Each stage takes typed input and
returns typed output plus `RationaleItem[]`, where each item carries a stable code,
parameters and evidence pointing back at the intake fields that produced it.
Localized sentences are assembled by renderers from those codes.

An LLM may later:

- polish prose inside an already-structured report section, or
- help a human author draft rulepack entries offline, for human review.

An LLM may never produce recommendations, sequencing or scores.

## Consequences

**Good.** Output is reproducible and diffable. Every finding is traceable to an
input. The engine is testable with plain fixtures and golden snapshots. The product
runs with no API keys, no model provider and no per-request cost, which also makes
it self-hostable by public bodies that cannot send their situation to a third party.

**Costs.** Rule authoring is real work, and rule quality is now the main product
risk — mitigated by mandatory sourcing and review dates on every rulepack entry.
Output is less fluent than generated prose; the report design compensates with
structure, tables and indicators rather than paragraphs.

**Enforcement.** `eslint.config.mjs` forbids `src/engine`, `src/rulepack` and
`src/report` from importing React, Next, next-intl, Prisma or app code, and forbids
currency literals in their output.
