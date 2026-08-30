import { getTranslations } from "next-intl/server";
import { ExpertContactBlock } from "@/components/shell/expert-contact";
import {
  Badge,
  ComplexityDots,
  FigureCard,
  KpiCard,
  Meter,
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
    <ul className={`space-y-1.5 ${dense ? "text-xs" : "text-sm"}`}>
      {items.map((item, index) => (
        <li key={`${item.code}-${index}`} className="flex gap-2">
          <span
            aria-hidden="true"
            className={[
              "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
              item.severity === "blocker" || item.severity === "caution"
                ? "bg-[var(--color-caution)]"
                : "bg-[var(--color-line-strong)]",
            ].join(" ")}
          />
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
  const locale = report.locale;
  // Prerequisite ids are interpolated into section 9's next steps, and their
  // labels live in the document rather than the message catalogue.
  const labels = prerequisiteLabels(report.roadmap.phases, locale);

  const categoryLabel = (id: string) => v(`category.${id}.label` as never);
  const glance = report.atAGlance;

  // Priced subscription exposure, or null when nothing in the stack carries a
  // citable published price (ADR-0003). Formatting lives in `@/report/money` so
  // this view, the Markdown export and the print route cannot disagree about a
  // figure someone is going to check against an invoice.
  const exposure = report.savings.subscriptionExposure;
  const money = (cents: number) => formatAmount(cents, "EUR", locale);

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

      {/* At a glance */}
      <section id="glance" className="mt-8 scroll-mt-24">
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
            label={r("glance.phases")}
            value={String(glance.activePhases)}
            detail={r("glance.phasesDetail")}
          />
        </div>
      </section>

      <div className="mt-12 space-y-12">
        {/* 1 Executive summary */}
        <Section id="summary" number={1} title={r("summary.title")}>
          <div className="text-muted space-y-3 text-sm leading-relaxed">
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

              <div className="grid gap-3 sm:grid-cols-2">
                <FigureCard
                  label={r("savings.exposureCurrent")}
                  value={money(exposure.annualCents)}
                  basis={r("savings.exposureCoverage", {
                    priced: exposure.categoriesPriced,
                    assessed: exposure.categoriesAssessed,
                    seats: exposure.seatsPriced,
                  })}
                />
                <FigureCard
                  label={r("savings.exposureAvoided")}
                  value={money(exposure.avoidedAnnualCents)}
                  tone={exposure.avoidedAnnualCents > 0 ? "good" : "neutral"}
                  basis={r("savings.exposureNote")}
                />
              </div>

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
                      {basisLine(
                        basis,
                        exposure.currency,
                        report.locale,
                        (key, values) => t(key as never, values as never),
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

                    <div className="mt-3">
                      <RationaleList
                        items={entry.recommended.fitReasons}
                        t={t}
                        labels={labels}
                        dense
                      />
                    </div>

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
            {report.roadmap.phases
              .filter(
                (phase) =>
                  phase.migrations.length > 0 || phase.prerequisites.length > 0,
              )
              .map((phase) => (
                <div
                  key={phase.id}
                  className="border-line bg-surface break-inside-avoid rounded-lg border p-4"
                >
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 className="text-ink text-base font-semibold">
                      {r(`phase.${phase.id}.title` as never)}
                    </h3>
                    <span className="text-muted tabular ml-auto text-xs">
                      {r("roadmap.effort", {
                        min: phase.effortDays.min,
                        max: phase.effortDays.max,
                      })}
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
                            {r("roadmap.effort", {
                              min: migration.effort.days.min,
                              max: migration.effort.days.max,
                            })}
                            {migration.pilotRecommended
                              ? ` · ${r("roadmap.pilot")}`
                              : ""}
                            {migration.externalSupportLikely
                              ? ` · ${r("roadmap.externalSupport")}`
                              : ""}
                          </p>

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
              ))}
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
