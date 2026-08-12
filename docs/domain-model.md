# Domain model

Everything lokal reasons about lives in `src/domain`. This layer knows about
organizations and software categories. It knows nothing about React, the database
or the rulepack.

## Vocabulary (`enums.ts`)

Values are stable identifiers, never display text. Labels live in the message
catalogs under matching keys, so the engine can reason about an organization
without ever holding a localized string.

Each vocabulary is declared once as a `const` tuple, and both the TypeScript union
and the Zod schema derive from it:

```ts
export const ORG_TYPES = ["sme", "municipality", ...] as const;
export type OrgType = (typeof ORG_TYPES)[number];
// …later
orgType: z.enum(ORG_TYPES)
```

Adding a member in one place but not the other is not expressible.

## Intake (`intake.ts`)

Types are inferred from the Zod schemas (`z.infer`) rather than declared alongside
them, so validation and types cannot drift.

| Group       | Contents                                                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `org`       | Organization type, country, region, seats, departments, public-sector context, German-language requirement                     |
| `operating` | Hosting preference, IT maturity, admin capacity, identity maturity, Linux capability, support expectation                      |
| `stack[]`   | One entry per assessed category: current tool, seats, criticality, pain, urgency, lock-in concern, training sensitivity, notes |
| `ai`        | Interest, data sensitivity, deployment preference, hardware profile, desired use cases                                         |

### Decisions worth knowing

**Size bucket is derived, not asked.** The plan listed both a size bucket and a
seat count as inputs. Collecting both invites a contradiction — "21–50" alongside
400 seats — that the engine would then have to arbitrate. `totalSeats` is the
input; `sizeBucketForSeats()` derives the bucket. Both still appear in the report.

**Per-category seats may differ from the organization total,** and legitimately so:
a helpdesk tool may serve twelve people in a 180-seat authority. The schema does not
force them to agree. The engine flags implausible spreads as a data-quality note
instead, because a wrong seat count silently distorts effort and training estimates.

**The current tool is a tagged union,** not a string with reserved sentinel values:

```ts
{ kind: "known", id: "nextcloud" } | { kind: "other", label: "…" } | { kind: "none" }
```

"We use something your catalog does not know" and "we have nothing here" are
different situations that lead to different plans. Overloading a string would blur
them.

**A category absent from `stack[]` is "not assessed", never "nothing to do".**
Silence is not a finding, and the report says so explicitly rather than implying
the category is handled.

**`schemaVersion` is a literal,** so a stored payload from an older shape fails
loudly at parse time instead of half-populating a report.

## Rationale (`rationale.ts`)

A `RationaleItem` is never a sentence:

```ts
{
  code: "rationale.hosting.self_hosted_without_linux",  // stable message key
  severity: "caution",
  params: { seats: 180 },
  evidence: [{ field: "operating.linuxCapability", value: "none" }],
}
```

`evidence` points back at the intake fields that caused the finding. This is what
lets the report answer "why is our helpdesk migration in phase 3?" using the
reader's own answers, and what makes two runs a month apart comparable.

`bySeverity()` is a stable sort: ties keep insertion order, so engine output stays
byte-identical across runs. That property is asserted in tests, because the
determinism guarantee depends on it.

Codes are part of the report's contract. Renaming one breaks stored assessments
rendered against a newer rulepack.
