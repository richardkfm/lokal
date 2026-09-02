# Phase 8 — Der Plan als Entscheidungsvorlage

## Why this phase exists

A live plan was reviewed by an IT lead who then asked the question this phase
exists to answer: _what would I actually hand to my management with this?_

Three gaps came back, and reading the code confirmed all three.

**The operating system is not in the model at all.** The nine categories are
applications. `operating.linuxCapability` asks about the IT team's _server_
skills and decides whether self-hosting is realistic; it is never a migration
target. `windows-file-server` is a source tool for `file_sharing` and nothing
more. Client devices, their operating system, their number, and the Windows-only
Fachverfahren that actually decide whether a desktop can move are never asked
about. For the Microsoft-shop SME and Kommune this tool is aimed at, the desktop
is the largest single piece of lock-in in the building, and lokal had nothing to
say about it.

**The days have no "why" and no calendar.** `BAND_DAYS` is a five-entry lookup
and `bandFor()` picks from it using difficulty plus two seat thresholds — while
emitting no rationale at all. So the report printed "3–8 Tage" with nothing
behind it. Worse: the per-migration `difficulty.drivers` _are_ computed, and _are_
carried in `PlanningReport`, and both renderers dropped them on the floor. The
document already contained the answer and never showed it. And admin-days are
not a timeframe — nothing converted them into elapsed months, so the one
question a Bürgermeister asks first, "wie lange dauert das?", had no answer
anywhere in twelve pages.

**There was no cost side.** ADR-0003 permitted gross subscription exposure and
avoided subscription cost only, so the report said what staying costs and never
what moving costs. Its own offsets — "9–20 Verwaltungstage" — sat in prose,
unpriced, next to a euro figure they could not be compared with.

A fourth followed from reading the running document rather than the code: the
report is stacked. Nine sections at identical weight in a flat run, opening with
Zusammenfassung and Vorteile, with no page a decision-maker reads first. There is
no section navigation at all — every section carries a `scroll-mt-24` anchor and
nothing has ever linked to one. And the single named human to call renders after
§9, below Tragfähigkeit and Nächste Schritte.

## Scope

Grouped as they are committed, in dependency order.

1. **ADR-0004** — declared rates for the cost side.
2. **Intake** — a workplace block and two optional rate fields, behind a schema
   upgrade path that keeps every existing report link working.
3. **Wizard** — the questions, nothing seeded, every answer on the review step.
4. **Rulepack `v2026-10`** — the client-OS lane as rules, not products.
5. **Engine** — effort explained, effort scheduled, the OS verdict, the cost.
6. **Report** — §0 Entscheidungsvorlage, and the three renderers in step.
7. **Sichtbarkeit** — navigation, the timeline, the money at figure scale, the
   contact where it can be seen.

## Out of scope

- **A distribution catalogue for the client OS.** Ubuntu LTS, openSUSE and
  Debian as scored target tools with fit reasons, ruled-out lists and hosting
  modes is a rulepack research job of the same size as one of the original nine
  categories, and it is not what was asked for. The lane answers _whether and
  when_, with reasons; _which_ is deferred to v0.4.0. This is deliberate and it
  is the reason the lane can ship as rules with no product research behind it.
- **E-Mail und Groupware as a category.** Named in `plans/roadmap.md` rather
  than quietly omitted, because it is the obvious question a reader will have
  once the desktop is on the table: no OS plan is fully credible while mail sits
  on Exchange. Adding it means source tools, target tools, edges and prices —
  a phase of its own.
- **Verzeichnis und Server-OS.** Active Directory and Windows Server are today
  implied by the `identity-directory` prerequisite and never named as a
  migration with its own effort and risk. Same reasoning, same deferral.
- **Break-even, Amortisation, ROI.** Permanently deferred, restated in ADR-0004.
  Every ingredient such a figure needs is one of the costs lokal explicitly does
  not price, which is exactly why it cannot produce one honestly.
- **Server-side PDF.** Still v0.3.0.
- **A general section-weighting mechanism.** Considered and rejected under
  "Decisions" below.

## Decisions

**The cost side extends ADR-0003 guardrail 1 rather than reversing guardrail 5.** ADR-0003 refused a net saving because "hosting, support, training and
internal time are real costs that lokal does not price". That is a statement
about lokal inventing a price, not about an organization declaring one. An
internal day rate is a fact the organization knows and lokal does not, so asking
for it is the same move as asking for seat counts. No rate declared means no
cost column — absent, not estimated. See ADR-0004.

**The client-OS lane is rules, not a product recommendation.** The most common
verdict it will produce is "noch nicht, und hier ist warum", which is the
`keep for now` shape applied to the desktop — one of the outputs CLAUDE.md
names as proving the thesis. A tool that recommended "Ubuntu LTS" on the
strength of five intake answers would be exactly the alternatives finder lokal
exists not to be.

**The OS moves last, and that is encoded as a sequencing constraint rather than
written as prose.** Applications become cross-platform while the organization is
still on Windows; the desktop swap is the final step. This is the lesson of every
public-sector desktop migration that ran the other way round, and it is the kind
of judgement that separates a plan from a list. It appears in the roadmap as a
placement rule and in the report as a stated reason.

**Effort decomposition explains the number and must not change it.** The work
packages are normalised and rounded so that they sum exactly to the band's `min`
and `max`. If `capacity.totalEffortDays` moves for any persona fixture, this
stopped being an explanation and became a scoring change — and a scoring change
disguised as a rendering improvement is how a planning tool starts lying about
its own history. The regression guard is a fixture assertion, run before
anything else in the engine group lands.

**Calendar duration has a floor that capacity cannot lower.** Dividing effort
days by available days per year gives a number that is wrong for large
organizations: 180 people cannot be retrained in a week however many
administrator-days exist. The floor is driven by seats and training load, and
where it binds rather than capacity, the report says so — "die Dauer wird hier
nicht von der Administrationszeit bestimmt, sondern von der Zahl der zu
schulenden Personen" is a finding management should see, not an implementation
detail.

**Existing report links keep working.** `assessmentInputSchema` pins
`schemaVersion` with `z.literal`, so bumping it to 2 would make every stored
payload fail to parse and every shared link 404. The schema accepts both
versions and `upgradeAssessmentInput()` fills v1 payloads with `unknown` and no
rates. The report then _says_ those answers are missing rather than assuming
them — an unanswered OS question yields a `not_assessed` verdict, and an absent
rate yields no cost column, never a zero.

**Prominence is targeted, not systematic.** A `Section` weight prop and a
callout component were the tidier design and were rejected: a general mechanism
invites raising a fourth area, and then a fifth, and then nothing is raised.
Three areas are lifted by hand — the timeline, the two money figures, the
contact — and the rule against a fourth is written down here so the next pass
has to argue with it.

**The Beratungskontakt is prominent on screen and unchanged on paper.** A
Beschlussvorlage that names a service provider on page one reads as advertising,
which is the opposite of what an "internes Planungsdokument" is for. On screen,
where the IT lead is working and wants the phone number, it sits in the rail.

**The printed report must not get longer — revised, having been measured.**

The constraint as first written was that the sheet count must not rise. It was
measured against `main` on the same report, rendered through Chromium at A4:
**14 sheets before, 17 after.**

The intent behind the rule was that §0 must not be additive padding, and that
half of it holds: §0 occupies a little under one sheet and breaks to its own
page, and the prominence work around it is net neutral on paper. The timeline
draws once rather than twice, the contact rail is `print:hidden`, and "Auf einen
Blick" is folded into §0 for print, because a separate summary section directly
beneath the summary page is the same job done twice on the same sheet.

The remaining two sheets are content, not decoration: the work-package breakdown
under every migration, the difficulty drivers that had never reached a page, the
client-OS verdict, and the cost column beside the exposure column. Cutting any of
them to hold a page count would be cutting exactly what this phase was asked
for — the reasoning behind the days and the money to set against them.

So the rule is narrowed rather than dropped, and the narrowed version is the one
a later pass has to argue with: **§0 stays within one sheet, and no _presentation_
change may add a sheet.** Content may, and has, and says so here.

## Verification

- `pnpm check` and `pnpm build` green.
- The five persona fixtures produce byte-identical `capacity.totalEffortDays`,
  roadmap phase membership and `savings.band` after the engine commits.
- A v1 payload still loads and still renders — an assessment stored before this
  change is the acceptance case.
- `pnpm test:e2e` green, including the axe pass over both locales.
- The printed PDF: §0 is one A4 page, the timeline is legible in greyscale, the
  contact rail is absent, and the sheet count has not grown.
- A wizard run with `clientOs: windows`, `windowsOnlyApps: few` and a declared
  day rate produces a first page stating the horizon in months, both money
  columns with their basis, and an OS verdict with a reason. The same run
  without rates produces no cost column rather than a zero.
