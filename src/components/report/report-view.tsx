import { getLocale, getTranslations } from "next-intl/server";
import { ExpertContactBlock } from "@/components/shell/expert-contact";
import {
  Badge,
  ComplexityDots,
  FigureCard,
  KpiCard,
  Meter,
  PhaseTimeline,
  Section,
  SeatImpactBar,
  toneForScore,
} from "./indicators";
import { basisLine, formatAmount } from "@/report/money";
import { localizeParams, prerequisiteLabels } from "@/report/params";
import type { DocumentLabels } from "@/report/params";
import type { PlanningReport } from "@/report/schema";
import type { RationaleItem } from "@/domain/rationale";

/**
 * The report.
 *
 * Every section takes its own slice of the PlanningReport and nothing else — it
 * never reaches into the engine or the raw assessment. Fully server-rendered:
 * the print route depends on there being no client components in this tree, and
 * that constraint is what makes server-side PDF a later addition rather than a
 * rewrite (docs/adr/0002-print-first-pdf.md).
 */

type Translate = Awaited<ReturnType<typeof getTranslations>>;

/** Renders a rationale code with its parameters. */
function rationaleText(
  t: Translate,
  item: RationaleItem,
  labels: DocumentLabels,
): string {
  const params = localizeParams(item.params, (key) => t(key as never), labels);
  return t(`rationale.${item.code}` as never, params as never);
}

function RationaleList({
  items,
  t,
  labels,
  dense,
}: {
  items: RationaleItem[];
  t: Translate;
  labels: DocumentLabels;
  dense?: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <ul className={`max-w-[68ch] space-y-1.5 ${dense ? "text-sm" : "text-base"}`}>
      {items.map((item, index) => (
        <li key={`${item.code}-${index}`} className="flex gap-2">
          {/* Severity by shape as well as colour.
           *
           * A 6px amber dot beside a 6px grey one is the difference between
           * "note this" and "and also", encoded in hue alone at a size where
           * hue barely registers. It survives the print palette by luck and a
           * mono laser not at all. A rotated square costs nothing and reads in
           * greyscale, and the screen-reader label is what a sighted reader
           * gets from the colour. */}
          <span
            aria-hidden="true"
            className={[
              "mt-1.5 h-1.5 w-1.5 shrink-0",
              item.severity === "blocker" || item.severity === "caution"
                ? "rotate-45 bg-[var(--color-caution)]"
                : "rounded-full bg-[var(--color-neutral)]",
            ].join(" ")}
          />
          {item.severity === "blocker" || item.severity === "caution" ? (
            <span className="sr-only">{t("report.severityCaution")} </span>
          ) : null}
          <span className="text-muted leading-relaxed">
            {rationaleText(t, item, labels)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function localized(text: { de: string; en?: string }, locale: string): string {
  return locale === "en" ? (text.en ?? text.de) : text.de;
}

type SectionEntry = {
  id: string;
  number: number;
  title: string;
  /** One of the three areas this phase lifted, marked so the map shows it. */
  raised: boolean;
};

/**
 * The document's sections, in order.
 *
 * Every section has carried a `scroll-mt-24` anchor since phase 4 and nothing
 * has ever linked to one, so twelve pages scrolled past with no map. This one
 * list feeds the screen rail, the printed table of contents and nothing else —
 * two lists is how a section gets added to one and forgotten in the other.
 */
export function reportSections(t: (key: string) => string): SectionEntry[] {
  return [
    { id: "brief", number: 0, title: t("brief.title"), raised: true },
    { id: "summary", number: 1, title: t("summary.title"), raised: false },
    { id: "advantages", number: 2, title: t("advantages.title"), raised: false },
    { id: "savings", number: 3, title: t("savings.title"), raised: true },
    { id: "stack", number: 4, title: t("stack.title"), raised: false },
    { id: "roadmap", number: 5, title: t("roadmap.title"), raised: true },
    { id: "capacity", number: 6, title: t("capacity.title"), raised: false },
    { id: "ai", number: 7, title: t("ai.title"), raised: false },
    { id: "scalability", number: 8, title: t("scalability.title"), raised: false },
    { id: "next", number: 9, title: t("next.title"), raised: false },
  ];
}

export async function ReportView({
  report,
  print = false,
}: {
  report: PlanningReport;
  print?: boolean;
}) {
  const t = await getTranslations();
  const r = await getTranslations("report");
  const v = await getTranslations("vocabulary");

  /**
   * The reader's locale, not the respondent's.
   *
   * `report.locale` records the language the intake was answered in, which is
   * worth storing and is not a statement about who reads the result. Using it
   * here meant `/en/report/<id>` returned German tool summaries, prerequisite
   * labels, AI descriptions and "30. August 2026" — every string that comes
   * from the rulepack rather than the message catalogue, which is most of the
   * document's substance. The catalogue is at full parity; this was the last
   * mile undoing it.
   *
   * The Markdown export keeps the stored locale on purpose: its route carries
   * no locale segment, so the language the report was created in is the only
   * signal it has.
   */
  const locale = (await getLocale()) as PlanningReport["locale"];
  // Prerequisite ids are interpolated into section 9's next steps, and their
  // labels live in the document rather than the message catalogue.
  const labels = prerequisiteLabels(report.roadmap.phases, locale);

  const categoryLabel = (id: string) => v(`category.${id}.label` as never);
  const glance = report.atAGlance;

  // Priced subscription exposure, or null when nothing in the stack carries a
  // citable published price (ADR-0003). Formatting lives in `@/report/money` so
  // this view, the Markdown export and the print route cannot disagree about a
  // figure someone is going to check against an invoice.
  /**
   * Fit criteria that hold for every recommendation, stated once.
   *
   * Six category cards each listed the same five reasons — "Hohe Datenhoheit",
   * "Dienstleister in Deutschland verfügbar", "Belastbare deutschsprachige
   * Oberfläche" and the rest — which is roughly thirty bullets carrying about
   * five facts. Repetition at that density is the texture of generated text,
   * and this audience is primed to look for it; worse, it buried the lines that
   * *are* per-category analysis inside a wall of sameness.
   *
   * Keyed on code plus parameters, so `fits_chosen_ecosystem` counts as shared
   * only when it names the same ecosystem everywhere.
   */
  const recommendations = report.targetStack.filter((entry) => entry.recommended);
  const fitKey = (item: RationaleItem) =>
    `${item.code}::${JSON.stringify(item.params)}`;
  const sharedFit =
    recommendations.length > 1
      ? (recommendations[0]!.recommended!.fitReasons.filter((item) =>
          recommendations.every((entry) =>
            entry.recommended!.fitReasons.some(
              (other) => fitKey(other) === fitKey(item),
            ),
          ),
        ) ?? [])
      : [];
  const sharedFitKeys = new Set(sharedFit.map(fitKey));

  const exposure = report.savings.subscriptionExposure;
  const brief = report.decisionBrief;

  // One derivation for both placements — compact in §0, full above the phase
  // cards in §5 — so the two drawings cannot disagree about the same plan.
  const timelinePhases = report.roadmap.phases.map((phase) => ({
    id: phase.id,
    title: r(`phase.${phase.id}.title` as never),
    startMonth: phase.duration.startMonth,
    endMonth: phase.duration.endMonth,
    empty: phase.migrations.length === 0 && phase.prerequisites.length === 0,
  }));
  const timelineLabel = r("roadmap.timelineLabel", {
    min: report.schedule.horizonMonths.min,
    max: report.schedule.horizonMonths.max,
    phases: timelinePhases
      .filter((phase) => !phase.empty)
      .map((phase) => `${phase.title}: ${phase.startMonth}–${phase.endMonth}`)
      .join("; "),
  });
  const monthLabel = (month: number) => r("roadmap.monthTick", { month });

  const sections = reportSections(r);
  const money = (cents: number) => formatAmount(cents, "EUR", locale);

  /**
   * A day range, or a single number when its ends are equal.
   *
   * "1–1 Tage" is not a range, and it is exactly the kind of sloppiness that
   * makes an estimate look machine-made to the reader who is deciding whether to
   * trust it. The `same` flag is a select rather than two message keys, so the
   * two forms cannot drift apart in one locale.
   */
  const dayRange = (days: { min: number; max: number }) =>
    r("roadmap.effort", {
      min: days.min,
      max: days.max,
      same: days.min === days.max ? "yes" : "no",
    });

  return (
    <article className={print ? "report-print" : ""}>
      {/* Cover */}
      <header className="border-line border-b pb-6 print:break-after-avoid">
        <p className="text-faint text-xs tracking-widest uppercase">
          {r("documentKind")}
        </p>
        <h1 className="text-ink mt-2 text-3xl font-semibold tracking-tight text-balance">
          {r("title")}
        </h1>
        <p className="text-muted mt-3 text-sm">
          {r("coverLine", {
            orgType: v(`orgType.${report.organization.orgType}.label` as never),
            seats: report.organization.totalSeats,
            date: new Date(report.generatedAt).toLocaleDateString(locale, {
              year: "numeric",
              month: "long",
              day: "numeric",
            }),
          })}
        </p>
        {report.rulepackIsDraft ? (
          <p className="text-ink mt-4 rounded-md border border-[var(--color-caution)] bg-[var(--color-caution-soft)] p-3 text-xs leading-relaxed">
            {r("draftRulepackNotice", { version: report.rulepackVersion })}
          </p>
        ) : null}
      </header>

      {/* 0 Entscheidungsvorlage — the page a decision-maker reads.
       *
       * The report was nine sections at identical weight opening with
       * Zusammenfassung and Vorteile, and an IT lead had nowhere to point a
       * Bürgermeister or a Geschäftsführung. This is that page, and it must fit
       * on one sheet: it replaces reading rather than adding to it. If the
       * printed report gets longer because of this section, it failed.
       *
       * Everything here is already in the document. §0 derives nothing. */}
      <section id="brief" className="mt-8 scroll-mt-24 print:break-after-page">
        <h2 className="text-ink border-line border-b pb-2 text-2xl font-semibold tracking-tight">
          {r("brief.title")}
        </h2>
        <p className="text-muted mt-3 max-w-[68ch] text-base leading-relaxed">
          {r("brief.lead", {
            planned: brief.migrationsPlanned,
            keep: brief.categoriesKept,
            total: report.organization.totalSeats,
          })}
        </p>

        {/* The three figures a decision rests on: how long, what it costs to
            move, what is being spent today. */}
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <FigureCard
            label={r("brief.horizonLabel")}
            value={r("brief.horizonValue", {
              min: report.schedule.horizonMonths.min,
              max: report.schedule.horizonMonths.max,
            })}
            basis={r("brief.horizonBasis", { phases: glance.activePhases })}
          />

          {/* Neither money card may use the "good" tone.
           *
           * Phase 7 removed a green euro figure labelled "entfällt" because
           * green plus an amount reads as a saving whatever the label says, and
           * the same trap is open here: a cost in red and an exposure in green
           * would make the subtraction for the reader, which is exactly what
           * ADR-0004 guardrail 3 forbids. */}
          <FigureCard
            label={r("brief.costLabel")}
            value={
              report.cost.totalCents
                ? r("brief.costValue", {
                    min: money(report.cost.totalCents.min),
                    max: money(report.cost.totalCents.max),
                  })
                : r("brief.costAbsent")
            }
            basis={
              report.cost.internal
                ? r("brief.costBasis", {
                    minDays: report.cost.internal.days.min,
                    maxDays: report.cost.internal.days.max,
                    rate: money(report.cost.internal.rateCents),
                  })
                : r("brief.costAbsentBasis")
            }
          />

          <FigureCard
            label={r("brief.exposureLabel")}
            value={exposure ? money(exposure.annualCents) : r("brief.exposureAbsent")}
            basis={
              exposure
                ? r("savings.exposureCoverage", {
                    priced: exposure.categoriesPriced,
                    assessed: exposure.categoriesAssessed,
                    seats: exposure.seatsPriced,
                  })
                : r("brief.exposureAbsentBasis")
            }
          />
        </div>

        <div className="mt-5">
          <PhaseTimeline
            phases={timelinePhases}
            label={timelineLabel}
            monthLabel={monthLabel}
          />
        </div>

        {/* Between the figures and everything else, because a reader who sees
            two amounts side by side will subtract them, and this is the one
            caveat that has to survive someone reading only this page. */}
        <p className="border-line text-muted mt-4 border-l-2 py-1 pl-3 text-sm leading-relaxed">
          {r("brief.notSubtractable")}
        </p>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <h3 className="text-ink mb-2 text-base font-medium">
              {r("brief.risksTitle")}
            </h3>
            {brief.topRisks.length > 0 ? (
              <RationaleList items={brief.topRisks} t={t} labels={labels} dense />
            ) : (
              <p className="text-muted text-sm leading-relaxed">
                {r("brief.risksNone")}
              </p>
            )}
          </div>
          <div>
            <h3 className="text-ink mb-2 text-base font-medium">
              {r("brief.asksTitle")}
            </h3>
            <RationaleList items={brief.asks} t={t} labels={labels} dense />
          </div>
        </div>

        {/* Printed only: the four at-a-glance figures §0 does not otherwise
            carry. On screen they stay in their own grid below; on paper a
            separate summary section directly under this one is the same job
            done twice on the same sheet. */}
        <div className="mt-5 hidden flex-wrap gap-2 print:flex">
          <Badge tone={toneForScore(glance.readiness.score)}>
            {r("glance.readiness")}:{" "}
            {r(`readinessLabel.${glance.readiness.label}` as never)}
          </Badge>
          <Badge
            tone={glance.migrationPosture === "prepare_first" ? "caution" : "neutral"}
          >
            {r("glance.posture")}: {r(`posture.${glance.migrationPosture}` as never)}
          </Badge>
          <Badge>
            {r("glance.savings")}: {r(`outlook.${glance.savingsOutlook}` as never)}
          </Badge>
          <Badge>
            {r("glance.ai")}: {r(`aiPosture.${glance.aiPosture}` as never)}
          </Badge>
        </div>

        {/* The desktop, on the first page, because for this audience it is the
            question that decides whether the rest is worth reading. */}
        <div className="border-line mt-6 rounded-lg border p-4">
          <h3 className="text-ink text-base font-medium">{r("brief.clientOsTitle")}</h3>
          <p className="text-muted mt-1 text-sm leading-relaxed">
            {r(`clientOsVerdict.${report.clientOs.verdict}` as never)}
          </p>
        </div>
      </section>

      {/* Inhalt — printed only.
       *
       * No page numbers: the print route has no pagination model, and a wrong
       * page number is worse than none. Section numbers are the reference, and
       * they are on every heading. On screen this is the rail beside the
       * document instead, which is a better shape for scrolling and a worse one
       * for paper. */}
      <nav
        aria-label={r("contents.title")}
        className="mt-8 hidden break-inside-avoid print:block"
      >
        <h2 className="text-ink text-base font-semibold">{r("contents.title")}</h2>
        <ol className="mt-2 space-y-0.5">
          {sections.map((section) => (
            <li key={section.id} className="text-muted text-sm">
              <span className="text-faint tabular mr-2">{section.number}</span>
              {section.title}
            </li>
          ))}
        </ol>
      </nav>

      {/* At a glance — screen only. Its four unique figures are carried into §0
          for print, above; keeping both on paper spends a sheet restating the
          page the reader has just read. */}
      <section id="glance" className="mt-8 scroll-mt-24 print:hidden">
        <h2 className="sr-only">{r("glance.title")}</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <KpiCard
            label={r("glance.readiness")}
            value={r(`readinessLabel.${glance.readiness.label}` as never)}
            detail={r("glance.readinessDetail", { score: glance.readiness.score })}
            tone={toneForScore(glance.readiness.score)}
          />
          <KpiCard
            label={r("glance.posture")}
            value={r(`posture.${glance.migrationPosture}` as never)}
            detail={r(`postureDetail.${glance.migrationPosture}` as never)}
            tone={glance.migrationPosture === "prepare_first" ? "caution" : "neutral"}
          />
          <KpiCard
            label={r("glance.savings")}
            value={r(`outlook.${glance.savingsOutlook}` as never)}
            detail={r("glance.savingsDetail")}
          />
          <KpiCard
            label={r("glance.ai")}
            value={r(`aiPosture.${glance.aiPosture}` as never)}
            detail={r("glance.aiDetail")}
          />
          <KpiCard
            label={r("glance.seats")}
            value={String(glance.affectedSeats)}
            detail={r("glance.seatsDetail", { total: report.organization.totalSeats })}
          />
          <KpiCard
            label={r("glance.horizon")}
            value={r("brief.horizonValue", {
              min: report.schedule.horizonMonths.min,
              max: report.schedule.horizonMonths.max,
            })}
            detail={r("glance.horizonDetail", { phases: glance.activePhases })}
            tone={report.schedule.exceedsCapacity ? "caution" : "neutral"}
          />
        </div>
      </section>

      <div className="mt-12 space-y-12">
        {/* 1 Executive summary */}
        <Section id="summary" number={1} title={r("summary.title")}>
          <div className="text-ink max-w-[68ch] space-y-3 text-base leading-relaxed">
            <p>
              {r("summary.context", {
                orgType: v(`orgType.${report.organization.orgType}.label` as never),
                seats: report.organization.totalSeats,
                bucket: report.organization.sizeBucket,
                categories: report.targetStack.length,
              })}
            </p>
            <p>
              {r("summary.target", {
                planned: report.roadmap.phases.reduce(
                  (sum, phase) => sum + phase.migrations.length,
                  0,
                ),
                keep: report.roadmap.keepForNow.length,
              })}
            </p>
            <p>{r(`postureNarrative.${glance.migrationPosture}` as never)}</p>
            <p>{r(`aiNarrative.${glance.aiPosture}` as never)}</p>
          </div>
        </Section>

        {/* 2 Advantages */}
        <Section id="advantages" number={2} title={r("advantages.title")}>
          <RationaleList items={report.advantages} t={t} labels={labels} />
        </Section>

        {/* 3 Savings */}
        <Section id="savings" number={3} title={r("savings.title")}>
          <div className="mb-4">
            <Badge
              tone={
                report.savings.band === "strong"
                  ? "good"
                  : report.savings.band === "moderate"
                    ? "brand"
                    : "neutral"
              }
            >
              {r(`outlook.${report.savings.band}` as never)}
            </Badge>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="text-ink mb-2 text-sm font-medium">
                {r("savings.drivers")}
              </h3>
              <RationaleList
                items={report.savings.drivers}
                t={t}
                labels={labels}
                dense
              />
            </div>
            <div>
              <h3 className="text-ink mb-2 text-sm font-medium">
                {r("savings.offsets")}
              </h3>
              <RationaleList
                items={report.savings.offsets}
                t={t}
                labels={labels}
                dense
              />
            </div>
          </div>
          {exposure ? (
            <div className="border-line mt-6 border-t pt-5">
              <h3 className="text-ink mb-3 text-sm font-medium">
                {r("savings.exposureTitle")}
              </h3>

              {/* One figure, not two.
               *
               * This was a pair of tiles — "Aktuell pro Jahr" and "Entfällt mit
               * diesem Plan" — usually carrying the *same* amount, the second
               * in green. ADR-0003 forbids a net saving, and a green number
               * labelled "entfällt", set larger than the four caveats beneath
               * it, is a net saving in everything but the noun. It is also the
               * number that would be quoted, without its basis, in a Vorlage.
               *
               * What the second tile actually knew — how much of the exposure
               * the roadmap removes — is a sentence, not a headline, and it is
               * only interesting when it differs from the whole. */}
              <div className="max-w-md">
                <FigureCard
                  label={r("savings.exposureCurrent")}
                  value={money(exposure.annualCents)}
                  basis={r("savings.exposureCoverage", {
                    priced: exposure.categoriesPriced,
                    assessed: exposure.categoriesAssessed,
                    seats: exposure.seatsPriced,
                  })}
                />
              </div>

              <p className="text-muted mt-3 text-sm leading-relaxed">
                {exposure.avoidedAnnualCents === 0
                  ? r("savings.exposureFallsAwayNone")
                  : exposure.avoidedAnnualCents >= exposure.annualCents
                    ? r("savings.exposureFallsAwayAll")
                    : r("savings.exposureFallsAwayPart", {
                        amount: money(exposure.avoidedAnnualCents),
                      })}{" "}
                {r("savings.exposureNote")}
              </p>

              {/* The audit trail. Every figure above traces to a line here, and
                  every line names a page the reader can open. */}
              <h4 className="text-faint mt-5 mb-2 text-xs tracking-wide uppercase">
                {r("savings.basisTitle")}
              </h4>
              <ul className="space-y-3">
                {exposure.basis.map((basis) => (
                  <li
                    key={basis.toolId}
                    className="border-line bg-sunken break-inside-avoid rounded-md border p-3 text-xs"
                  >
                    <p className="text-ink">
                      {basisLine(basis, exposure.currency, locale, (key, values) =>
                        t(key as never, values as never),
                      )}
                    </p>
                    <p className="text-muted mt-1">
                      {r("savings.basisAnnual")}: {money(basis.annualCents)} ·{" "}
                      {r("savings.basisCovers")}:{" "}
                      {basis.categories.map((id) => categoryLabel(id)).join(", ")}
                    </p>
                    {!basis.fallsAway ? (
                      <p className="mt-1 text-[var(--color-caution)]">
                        {r("savings.basisRemains", {
                          categories: basis.remainingCategories
                            .map((id) => categoryLabel(id))
                            .join(", "),
                        })}
                      </p>
                    ) : null}
                    <p className="text-faint mt-1 break-all">
                      {r("savings.basisSource")}: {basis.source}
                    </p>
                  </li>
                ))}
              </ul>

              <div className="mt-4">
                <RationaleList items={exposure.notes} t={t} labels={labels} dense />
              </div>
            </div>
          ) : null}

          {/* What the move costs, beside what staying costs (ADR-0004).
           *
           * The section stated an annual subscription figure and, pages later,
           * "9–20 Verwaltungstage" in prose — a number the reader could not
           * compare with the first one. Both columns now carry their basis, and
           * the sentence saying they are not subtractable sits between them
           * rather than beneath them, because a reader who sees two amounts side
           * by side will subtract them. */}
          {report.cost.totalCents ? (
            <div className="border-line mt-6 border-t pt-5">
              <h3 className="text-ink mb-3 text-sm font-medium">{r("cost.title")}</h3>
              <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
                {report.cost.internal ? (
                  <FigureCard
                    label={r("cost.internalLabel")}
                    value={`${money(report.cost.internal.cents.min)} – ${money(report.cost.internal.cents.max)}`}
                    basis={r("cost.lineBasis", {
                      minDays: report.cost.internal.days.min,
                      maxDays: report.cost.internal.days.max,
                      rate: money(report.cost.internal.rateCents),
                    })}
                  />
                ) : null}
                {report.cost.external ? (
                  <FigureCard
                    label={r("cost.externalLabel")}
                    value={`${money(report.cost.external.cents.min)} – ${money(report.cost.external.cents.max)}`}
                    basis={r("cost.lineBasis", {
                      minDays: report.cost.external.days.min,
                      maxDays: report.cost.external.days.max,
                      rate: money(report.cost.external.rateCents),
                    })}
                  />
                ) : null}
              </div>
              <p className="text-muted mt-3 text-sm leading-relaxed">
                {r("cost.coverage", {
                  migrations: report.cost.coverage.migrationsTotal,
                  external: report.cost.coverage.externalSupportMigrations,
                })}
              </p>
              <div className="mt-3">
                <RationaleList items={report.cost.notes} t={t} labels={labels} dense />
              </div>
            </div>
          ) : (
            <div className="border-line mt-6 border-t pt-5">
              <h3 className="text-ink mb-2 text-sm font-medium">{r("cost.title")}</h3>
              {/* Absent, not zero. A plausible placeholder looks discharged. */}
              <RationaleList items={report.cost.notes} t={t} labels={labels} dense />
            </div>
          )}

          <div className="border-line mt-5 border-t pt-3">
            <RationaleList
              items={report.savings.modelLimitations}
              t={t}
              labels={labels}
              dense
            />
          </div>
        </Section>

        {/* 4 Target stack */}
        <Section
          id="stack"
          number={4}
          title={r("stack.title")}
          lead={r("stack.lead")}
          breakBefore
        >
          {sharedFit.length > 0 ? (
            <div className="border-line bg-sunken mb-5 rounded-lg border p-4">
              <h3 className="text-ink text-base font-semibold">
                {r("stack.sharedFit", { count: recommendations.length })}
              </h3>
              <div className="mt-2">
                <RationaleList items={sharedFit} t={t} labels={labels} dense />
              </div>
            </div>
          ) : null}

          <div className="space-y-5">
            {report.targetStack.map((entry) => (
              <div
                key={entry.category}
                className="border-line bg-surface break-inside-avoid rounded-lg border p-4"
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 className="text-ink text-base font-semibold">
                    {categoryLabel(entry.category)}
                  </h3>
                  {entry.coverageDepth === "focused" ? (
                    <Badge tone="neutral">{r("stack.focusedCoverage")}</Badge>
                  ) : null}
                  <span className="text-muted tabular ml-auto text-xs">
                    {r("stack.seats", { seats: entry.seats })}
                  </span>
                </div>

                <p className="text-muted mt-2 text-sm">
                  <span className="text-faint">{r("stack.current")}:</span>{" "}
                  {entry.currentTool.name ?? r("stack.nothingInUse")}
                  {" → "}
                  <span className="text-ink font-medium">
                    {entry.recommended?.tool.name ?? r("stack.noViableTarget")}
                  </span>
                </p>

                {entry.recommended ? (
                  <>
                    <p className="text-muted mt-2 text-sm leading-relaxed">
                      {localized(entry.recommended.tool.summary, locale)}
                    </p>

                    {(() => {
                      const distinct = entry.recommended.fitReasons.filter(
                        (item) => !sharedFitKeys.has(fitKey(item)),
                      );
                      return distinct.length > 0 ? (
                        <div className="mt-3">
                          <RationaleList items={distinct} t={t} labels={labels} dense />
                        </div>
                      ) : null;
                    })()}

                    {entry.recommended.cautions.length > 0 ? (
                      <div className="mt-3 rounded-md border border-[var(--color-caution)] bg-[var(--color-caution-soft)] p-3">
                        <RationaleList
                          items={entry.recommended.cautions}
                          t={t}
                          labels={labels}
                          dense
                        />
                      </div>
                    ) : null}

                    <p className="text-faint mt-3 text-xs leading-relaxed">
                      {localized(entry.recommended.tool.scalabilityNotes, locale)}
                    </p>

                    {entry.backups.length > 0 ? (
                      <p className="text-muted mt-3 text-xs">
                        <span className="text-faint">{r("stack.backups")}:</span>{" "}
                        {entry.backups.map((backup) => backup.tool.name).join(", ")}
                      </p>
                    ) : null}
                  </>
                ) : null}

                {/* The disclosure below is open on paper, where there is no one
                 * to click it.
                 *
                 * That was CSS until it wasn't: `print.css` overrode `display`
                 * on the children, and Chromium hides them through
                 * `::details-content` instead, so a whole release printed
                 * "2 geprüft und ausgeschieden" with nothing under it — one of
                 * the four outputs CLAUDE.md says prove the thesis, missing
                 * from the copy that reaches a council. The prop cannot be
                 * defeated by the next change to how a browser hides closed
                 * content. */}
                {entry.ruledOut.length > 0 ? (
                  <details className="mt-3" open={print}>
                    <summary className="text-brand cursor-pointer text-xs">
                      {r("stack.ruledOut", { count: entry.ruledOut.length })}
                    </summary>
                    <ul className="mt-2 space-y-1.5 text-xs">
                      {entry.ruledOut.map(({ tool, reason }) => (
                        <li key={tool.id} className="text-muted leading-relaxed">
                          <span className="text-ink font-medium">{tool.name}</span>:{" "}
                          {rationaleText(t, reason, labels)}
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}

                <RationaleList items={entry.notes} t={t} labels={labels} dense />
              </div>
            ))}
          </div>
        </Section>

        {/* 5 Roadmap */}
        <Section
          id="roadmap"
          number={5}
          title={r("roadmap.title")}
          lead={r("roadmap.lead")}
          breakBefore
        >
          {/* The plan on one line, before the plan in detail.
           *
           * The document's only wide graphic, because the timeframe is the
           * question this section exists to answer and nothing else should
           * compete with it for the eye. */}
          {/* On screen only. §0 already carries the same drawing, and every phase
              card below states its own span in text — on paper this would be the
              same fact a third time, and a third telling costs a sheet. */}
          <div className="border-line mb-6 rounded-lg border p-4 print:hidden">
            <PhaseTimeline
              phases={timelinePhases}
              label={timelineLabel}
              monthLabel={monthLabel}
            />
            <p className="text-faint mt-3 text-xs leading-relaxed">
              {r("roadmap.timelineNote")}
            </p>
          </div>

          {/* A spine down the left of the phases, so the roadmap reads as one
              sequence rather than a stack of cards. The rail draws its own line,
              so it survives printing and reduced motion unchanged; only the dot
              is motion. */}
          <div className="relative space-y-4 sm:pl-8">
            <div
              className="path-rail path-rail-v absolute top-2 bottom-2 left-3 hidden sm:block"
              aria-hidden="true"
            >
              <span className="path-dot" />
            </div>
            {/* Empty phases are shown, not filtered away.
             *
             * Filtering left the printed headings reading "Phase 0", "Phase 2",
             * "Phase 3" — and a reader who notices the gap has no way to
             * resolve it, because the numbering is a property of the rulepack
             * they cannot see. Renumbering contiguously would hide the same
             * fact more neatly. For this audience an unoccupied phase is
             * itself a finding: it says the plan has nothing quick to offer,
             * or nothing left to optimize, and that is worth a line. */}
            {report.roadmap.phases.map((phase) =>
              phase.migrations.length === 0 && phase.prerequisites.length === 0 ? (
                <div
                  key={phase.id}
                  className="border-line break-inside-avoid rounded-lg border border-dashed p-3"
                >
                  <p className="text-muted text-sm">
                    <span className="text-ink font-medium">
                      {r(`phase.${phase.id}.title` as never)}
                    </span>
                    {": "}
                    {r("roadmap.phaseEmpty")}
                  </p>
                </div>
              ) : (
                <div
                  key={phase.id}
                  className="border-line bg-surface break-inside-avoid rounded-lg border p-4"
                >
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 className="text-ink text-base font-semibold">
                      {r(`phase.${phase.id}.title` as never)}
                    </h3>
                    <span className="text-muted tabular ml-auto text-xs">
                      {r("roadmap.phaseSpan", {
                        start: phase.duration.startMonth,
                        end: phase.duration.endMonth,
                      })}
                      {" · "}
                      {dayRange(phase.effortDays)}
                    </span>
                  </div>
                  <p className="text-muted mt-1 text-sm">
                    {r(`phase.${phase.id}.goal` as never)}
                  </p>

                  {phase.prerequisites.length > 0 ? (
                    <ul className="mt-3 space-y-2">
                      {phase.prerequisites.map((prerequisite) => (
                        <li key={prerequisite.id} className="text-sm">
                          <span className="text-ink font-medium">
                            {localized(prerequisite.label, locale)}
                          </span>
                          <span className="text-muted block text-xs leading-relaxed">
                            {localized(prerequisite.description, locale)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {phase.migrations.length > 0 ? (
                    <div className="mt-3 space-y-3">
                      {phase.migrations.map((migration) => (
                        <div
                          key={migration.category}
                          className="border-line border-t pt-3"
                        >
                          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                            <span className="text-ink text-sm font-medium">
                              {categoryLabel(migration.category)} → {migration.toolName}
                            </span>
                            <span className="ml-auto">
                              <ComplexityDots
                                score={migration.difficulty.score}
                                label={r(
                                  `difficulty.${migration.difficulty.label}` as never,
                                )}
                              />
                            </span>
                          </div>

                          <div className="mt-2 max-w-xs">
                            <SeatImpactBar
                              seats={migration.seats}
                              total={report.organization.totalSeats}
                              label={r("roadmap.seatsAffected")}
                            />
                          </div>

                          <p className="text-muted tabular mt-2 text-xs">
                            {dayRange(migration.effort.days)}
                            {migration.pilotRecommended
                              ? ` · ${r("roadmap.pilot")}`
                              : ""}
                            {migration.externalSupportLikely
                              ? ` · ${r("roadmap.externalSupport")}`
                              : ""}
                          </p>

                          {/* What the range is made of.
                           *
                           * The days used to arrive with nothing behind them.
                           * These items sum exactly to the range above them, so
                           * a reader who thinks the training estimate is wrong
                           * can see which line to argue with. */}
                          {migration.effort.items.length > 0 ? (
                            <p className="text-muted mt-1.5 text-xs leading-relaxed">
                              {migration.effort.items.map((item, index) => (
                                <span key={item.package}>
                                  {index > 0 ? " · " : ""}
                                  <span className="text-ink">
                                    {v(`workPackage.${item.package}.label` as never)}
                                  </span>{" "}
                                  <span className="tabular">{dayRange(item.days)}</span>
                                </span>
                              ))}
                            </p>
                          ) : null}

                          {/* Why this move is as hard as it is.
                           *
                           * These drivers were computed by the engine, carried
                           * in the document, and dropped by every renderer.
                           * They are the answer to "warum 18–35 Tage", stated
                           * in the reader's own answers. */}
                          {migration.difficulty.drivers.length > 0 ? (
                            <div className="mt-2">
                              <p className="text-faint text-xs">
                                {r("roadmap.whyThisHard")}
                              </p>
                              <div className="mt-1">
                                <RationaleList
                                  items={migration.difficulty.drivers}
                                  t={t}
                                  labels={labels}
                                  dense
                                />
                              </div>
                            </div>
                          ) : null}

                          <div className="mt-2">
                            <RationaleList
                              items={migration.reasons}
                              t={t}
                              labels={labels}
                              dense
                            />
                          </div>

                          {migration.gotchas.length > 0 ? (
                            <div className="mt-2">
                              <p className="text-faint text-xs">
                                {r("roadmap.watchOutFor")}
                              </p>
                              <ul className="mt-1 space-y-1 text-xs">
                                {migration.gotchas.map((gotcha) => (
                                  <li
                                    key={gotcha}
                                    className="text-muted leading-relaxed"
                                  >
                                    {t(`rationale.${gotcha}` as never)}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <RationaleList items={phase.notes} t={t} labels={labels} dense />
                </div>
              ),
            )}
          </div>

          {report.roadmap.keepForNow.length > 0 ? (
            <div className="border-line mt-6 rounded-lg border border-dashed p-4">
              <h3 className="text-ink text-sm font-semibold">
                {r("roadmap.keepForNow")}
              </h3>
              <p className="text-muted mt-1 text-xs leading-relaxed">
                {r("roadmap.keepForNowLead")}
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                {report.roadmap.keepForNow.map((deferred) => (
                  <li key={deferred.category}>
                    <span className="text-ink font-medium">
                      {categoryLabel(deferred.category)}
                    </span>
                    {deferred.currentToolName ? (
                      <span className="text-faint"> ({deferred.currentToolName})</span>
                    ) : null}
                    <span className="text-muted block text-xs leading-relaxed">
                      {rationaleText(t, deferred.reason, labels)}{" "}
                      {t(`rationale.${deferred.revisitWhen}` as never)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* The client operating system.
           *
           * Inside the roadmap rather than in a section of its own, because it
           * is a roadmap item: it has a phase, or a reason it has none. It sits
           * beside "vorerst unverändert lassen" because it is the same shape of
           * answer — usually "noch nicht, und hier ist warum". */}
          <div className="border-line mt-6 rounded-lg border p-4">
            <h3 className="text-ink text-base font-semibold">{r("clientOs.title")}</h3>
            <p className="text-muted mt-1 text-sm leading-relaxed">
              {report.clientOs.phase !== null
                ? r("clientOs.scheduledIn", {
                    phase: r(`phase.${report.clientOs.phase}.title` as never),
                  })
                : r("clientOs.notScheduled")}
            </p>

            {report.clientOs.effortDays && report.clientOs.devices ? (
              <p className="text-muted tabular mt-2 text-xs">
                {dayRange(report.clientOs.effortDays)}
                {" · "}
                {r(
                  report.clientOs.devices.source === "declared"
                    ? "clientOs.devicesDeclared"
                    : "clientOs.devicesFromSeats",
                  { count: report.clientOs.devices.count },
                )}
              </p>
            ) : null}

            <div className="mt-3">
              <RationaleList
                items={[...report.clientOs.blockers, ...report.clientOs.cautions]}
                t={t}
                labels={labels}
                dense
              />
            </div>

            {/* The gates. Shown open or manual rather than ticked off on the
                reader's behalf — a checklist that completes itself is not one. */}
            {report.clientOs.gates.length > 0 ? (
              <>
                <h4 className="text-faint mt-4 mb-2 text-xs tracking-wide uppercase">
                  {r("clientOs.gatesTitle")}
                </h4>
                <ul className="space-y-2">
                  {report.clientOs.gates.map((gate) => (
                    <li key={gate.id} className="text-sm">
                      <span className="text-ink font-medium">
                        {localized(gate.label, locale)}
                      </span>{" "}
                      <span className="text-faint text-xs">
                        {r(`clientOs.gate_${gate.status}` as never)}
                      </span>
                      <span className="text-muted block text-xs leading-relaxed">
                        {localized(gate.description, locale)}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}

            <div className="mt-3">
              <RationaleList
                items={report.clientOs.reasons}
                t={t}
                labels={labels}
                dense
              />
            </div>
          </div>
        </Section>

        {/* 6 Capacity and readiness */}
        <Section
          id="capacity"
          number={6}
          title={r("capacity.title")}
          lead={r("capacity.lead")}
        >
          <div className="space-y-3">
            {(
              [
                ["opsCapability", report.readiness.opsCapability],
                ["changeCapacity", report.readiness.changeCapacity],
                ["identityReadiness", report.readiness.identityReadiness],
                ["aiReadiness", report.readiness.aiReadiness],
              ] as const
            ).map(([key, band]) => (
              <Meter
                key={key}
                label={r(`readinessBand.${key}` as never)}
                score={band.score}
                caption={r(`readinessLabel.${band.label}` as never)}
                scaleLabel={r("glance.meterScale", { score: band.score })}
              />
            ))}
          </div>

          <div className="border-line mt-6 rounded-md border p-4">
            <p className="text-ink text-sm font-medium">{r("capacity.budget")}</p>
            <p className="text-muted tabular mt-1 text-sm">
              {r("capacity.budgetLine", {
                min: report.capacity.totalEffortDays.min,
                max: report.capacity.totalEffortDays.max,
                availableMin: report.capacity.availablePerYear.min,
                availableMax: report.capacity.availablePerYear.max,
              })}
            </p>
            <p className="text-faint mt-1 text-xs">{r("capacity.estimateNote")}</p>
            {/* Days answer a budgeting question; months answer the one that gets
                asked first. Both belong here, and the caveat travels with them. */}
            <p className="text-ink tabular mt-3 text-sm">
              {r("capacity.horizonLine", {
                min: report.schedule.horizonMonths.min,
                max: report.schedule.horizonMonths.max,
              })}
            </p>
            <div className="mt-2">
              <RationaleList
                items={report.schedule.notes}
                t={t}
                labels={labels}
                dense
              />
            </div>
          </div>

          {report.readiness.gaps.length > 0 ? (
            <div className="mt-5">
              <h3 className="text-ink mb-2 text-sm font-medium">
                {r("capacity.gaps")}
              </h3>
              <RationaleList items={report.readiness.gaps} t={t} labels={labels} />
            </div>
          ) : null}

          {report.capacity.gaps.length > 0 ? (
            <div className="mt-4">
              <RationaleList items={report.capacity.gaps} t={t} labels={labels} />
            </div>
          ) : null}
        </Section>

        {/* 7 Local AI */}
        <Section
          id="ai"
          number={7}
          title={r("ai.title")}
          lead={r("ai.lead")}
          breakBefore
        >
          {report.aiLane.recommendations.length === 0 ? (
            <RationaleList items={report.aiLane.notes} t={t} labels={labels} />
          ) : (
            <div className="space-y-4">
              {report.aiLane.recommendations.map((recommendation) => (
                <div
                  key={recommendation.useCaseId}
                  className="border-line bg-surface break-inside-avoid rounded-lg border p-4"
                >
                  <div className="flex flex-wrap items-baseline gap-3">
                    <h3 className="text-ink text-sm font-semibold">
                      {localized(recommendation.label, locale)}
                    </h3>
                    <Badge
                      tone={
                        recommendation.timing === "now"
                          ? "good"
                          : recommendation.timing === "pilot"
                            ? "brand"
                            : "neutral"
                      }
                    >
                      {r(`aiTiming.${recommendation.timing}` as never)}
                    </Badge>
                    {recommendation.deployment ? (
                      <span className="text-muted ml-auto text-xs">
                        {localized(recommendation.deployment.label, locale)}
                      </span>
                    ) : null}
                  </div>

                  <p className="text-muted mt-2 text-sm leading-relaxed">
                    {localized(recommendation.description, locale)}
                  </p>

                  <div className="mt-3">
                    <RationaleList
                      items={recommendation.reasons}
                      t={t}
                      labels={labels}
                      dense
                    />
                  </div>

                  <p className="text-faint mt-3 text-xs leading-relaxed">
                    {localized(recommendation.governanceNotes, locale)}
                  </p>

                  <div className="mt-2">
                    <RationaleList
                      items={recommendation.risks}
                      t={t}
                      labels={labels}
                      dense
                    />
                  </div>
                </div>
              ))}
              <RationaleList items={report.aiLane.notes} t={t} labels={labels} dense />
            </div>
          )}
        </Section>

        {/* 8 Scalability */}
        <Section
          id="scalability"
          number={8}
          title={r("scalability.title")}
          lead={r("scalability.lead")}
        >
          <dl className="border-line divide-line divide-y border-t border-b">
            {(
              [
                "currentSize",
                "growth",
                "moreDepartments",
                "stricterGovernance",
                "broaderAi",
                "selfHostingMaturity",
              ] as const
            ).map((key) => (
              <div key={key} className="flex flex-col gap-1 py-3 sm:flex-row sm:gap-4">
                <dt className="text-muted w-56 shrink-0 text-sm">
                  {r(`scalability.${key}` as never)}
                </dt>
                <dd className="flex-1">
                  <RationaleList
                    items={report.scalability[key]}
                    t={t}
                    labels={labels}
                    dense
                  />
                </dd>
              </div>
            ))}
          </dl>
        </Section>

        {/* 9 Next steps */}
        <Section id="next" number={9} title={r("next.title")}>
          <div className="grid gap-6 sm:grid-cols-2">
            {(
              [
                ["immediate", report.nextSteps.immediate],
                ["within30Days", report.nextSteps.within30Days],
                ["pilots", report.nextSteps.pilots],
                ["cautionFlags", report.nextSteps.cautionFlags],
              ] as const
            ).map(([key, items]) =>
              items.length > 0 ? (
                <div key={key}>
                  <h3 className="text-ink mb-2 text-sm font-medium">
                    {r(`next.${key}` as never)}
                  </h3>
                  <RationaleList items={items} t={t} labels={labels} dense />
                </div>
              ) : null,
            )}
          </div>
        </Section>

        {/* A human to call, when the operator has configured one.
            Placed after "next steps" because that is where a reader who has just
            been told the plan exceeds their capacity actually is. Renders
            nothing when unconfigured. */}
        <ExpertContactBlock variant={print ? "print" : "card"} />

        {/* Method and limits */}
        <section
          id="method"
          className="border-line scroll-mt-24 border-t pt-6 print:break-before-page"
        >
          <h2 className="text-ink text-sm font-semibold">{r("method.title")}</h2>
          <p className="text-muted mt-2 text-xs leading-relaxed">{r("method.lead")}</p>

          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <div>
              <h3 className="text-ink text-xs font-medium">
                {r("method.notModelled")}
              </h3>
              <ul className="text-muted mt-1.5 space-y-1 text-xs">
                {report.method.notModelled.map((code) => (
                  <li key={code}>{t(`rationale.${code}` as never)}</li>
                ))}
              </ul>
            </div>
            <div>
              {report.method.unassessedCategories.length > 0 ? (
                <>
                  <h3 className="text-ink text-xs font-medium">
                    {r("method.notAssessed")}
                  </h3>
                  <p className="text-muted mt-1.5 text-xs leading-relaxed">
                    {report.method.unassessedCategories
                      .map((id) => categoryLabel(id))
                      .join(", ")}
                  </p>
                </>
              ) : null}
              {report.method.dataQualityNotes.length > 0 ? (
                <div className="mt-4">
                  <h3 className="text-ink text-xs font-medium">
                    {r("method.dataQuality")}
                  </h3>
                  <div className="mt-1.5">
                    <RationaleList
                      items={report.method.dataQualityNotes}
                      t={t}
                      labels={labels}
                      dense
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <p className="text-faint mt-6 text-xs leading-relaxed">
            {r("method.footer", {
              engineVersion: report.engineVersion,
              rulepackVersion: report.rulepackVersion,
            })}
          </p>
          {/* A sentence about a URL, on a sheet of paper that has none. */}
          <p className="text-faint mt-2 text-xs leading-relaxed print:hidden">
            {r("method.linkNotice")}
          </p>
        </section>
      </div>
    </article>
  );
}
