import { basisLine, formatAmount } from "./money";
import { localizeParams, prerequisiteLabels } from "./params";
import type { DocumentLabels } from "./params";
import type { PlanningReport } from "./schema";
import type { RationaleItem } from "@/domain/rationale";

/**
 * Markdown export.
 *
 * Pure: no DOM, no framework, no clock. It reads the same PlanningReport the
 * screen and print views read, which is what keeps the three from disagreeing.
 *
 * Written to be pasted into a wiki, Confluence or an email without cleanup, so
 * it stays plain: headings, tables and lists, no HTML.
 */

export type MarkdownContext = {
  /** Translates a message key with parameters. Supplied by the caller. */
  t: (key: string, values?: Record<string, string | number | boolean>) => string;
};

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

/**
 * The context plus the labels only the document can supply — prerequisite ids
 * among them. Internal, so the caller's `MarkdownContext` stays a translator.
 */
type ListContext = MarkdownContext & { labels: DocumentLabels };

function list(items: RationaleItem[], { t, labels }: ListContext): string[] {
  return items.map(
    (item) =>
      `- ${t(`rationale.${item.code}`, localizeParams(item.params, t, labels))}`,
  );
}

function localized(text: { de: string; en?: string }, locale: string): string {
  return locale === "en" ? (text.en ?? text.de) : text.de;
}

export function toMarkdown(report: PlanningReport, context: MarkdownContext): string {
  const { t } = context;
  const r = (key: string, values?: Record<string, string | number | boolean>) =>
    t(`report.${key}`, values);
  const v = (key: string) => t(`vocabulary.${key}`);
  const category = (id: string) => v(`category.${id}.label`);
  /** A day range, or a single number when its ends are equal. See report-view. */
  const dayRange = (days: { min: number; max: number }) =>
    r("roadmap.effort", {
      min: days.min,
      max: days.max,
      same: days.min === days.max ? "yes" : "no",
    });
  const locale = report.locale;
  const labels = prerequisiteLabels(report.roadmap.phases, locale);
  const ctx: ListContext = { ...context, labels };

  const out: string[] = [];
  const push = (...lines: string[]) => out.push(...lines);
  const blank = () => out.push("");

  // --- Cover ---------------------------------------------------------------
  push(`# ${r("title")}`, "");
  push(
    r("coverLine", {
      orgType: v(`orgType.${report.organization.orgType}.label`),
      seats: report.organization.totalSeats,
      date: new Date(report.generatedAt).toISOString().slice(0, 10),
    }),
  );
  blank();
  push(`_${r("documentKind")}_`);
  blank();

  if (report.rulepackIsDraft) {
    push(`> ${r("draftRulepackNotice", { version: report.rulepackVersion })}`);
    blank();
  }

  // --- 0 Entscheidungsvorlage ----------------------------------------------
  //
  // The same page the screen and the print route open with. A Markdown export
  // that dropped it would be a third document telling a different story, and
  // this one is the copy that gets pasted into a wiki and read by whoever was
  // not in the room.
  const brief = report.decisionBrief;
  const money = (cents: number) => formatAmount(cents, "EUR", locale);

  push(`## 0. ${r("brief.title")}`, "");
  push(
    r("brief.lead", {
      planned: brief.migrationsPlanned,
      keep: brief.categoriesKept,
      total: report.organization.totalSeats,
    }),
    "",
  );

  push(`| | |`, `| --- | --- |`);
  push(
    `| ${r("brief.horizonLabel")} | ${r("brief.horizonValue", {
      min: report.schedule.horizonMonths.min,
      max: report.schedule.horizonMonths.max,
    })} |`,
    `| ${r("brief.costLabel")} | ${
      report.cost.totalCents
        ? `${money(report.cost.totalCents.min)} – ${money(report.cost.totalCents.max)}`
        : r("brief.costAbsent")
    } |`,
    `| ${r("brief.exposureLabel")} | ${
      report.savings.subscriptionExposure
        ? money(report.savings.subscriptionExposure.annualCents)
        : r("brief.exposureAbsent")
    } |`,
  );
  blank();

  // Immediately under the two amounts, never at the end of the section: a reader
  // who sees them side by side will subtract them (ADR-0004 guardrail 3).
  push(`> ${r("brief.notSubtractable")}`);
  blank();

  push(`### ${r("brief.risksTitle")}`, "");
  push(
    ...(brief.topRisks.length > 0 ? list(brief.topRisks, ctx) : [r("brief.risksNone")]),
    "",
  );
  push(`### ${r("brief.asksTitle")}`, "", ...list(brief.asks, ctx), "");
  push(
    `**${r("brief.clientOsTitle")}:** ${r(`clientOsVerdict.${report.clientOs.verdict}`)}`,
  );
  blank();

  // --- At a glance ---------------------------------------------------------
  const glance = report.atAGlance;
  push(`## ${r("glance.title")}`, "");
  push(`| | |`, `| --- | --- |`);
  push(
    `| ${r("glance.readiness")} | ${r(`readinessLabel.${glance.readiness.label}`)} (${glance.readiness.score}/100) |`,
    `| ${r("glance.posture")} | ${r(`posture.${glance.migrationPosture}`)} |`,
    `| ${r("glance.savings")} | ${r(`outlook.${glance.savingsOutlook}`)} |`,
    `| ${r("glance.ai")} | ${r(`aiPosture.${glance.aiPosture}`)} |`,
    `| ${r("glance.seats")} | ${glance.affectedSeats} / ${report.organization.totalSeats} |`,
    // The horizon replaces the phase count here too. Renderers that disagree
    // about the at-a-glance figures are how a printed copy and a pasted wiki
    // page start telling different stories about the same plan.
    `| ${r("glance.horizon")} | ${r("brief.horizonValue", { min: report.schedule.horizonMonths.min, max: report.schedule.horizonMonths.max })} (${r("glance.horizonDetail", { phases: glance.activePhases })}) |`,
  );
  blank();

  // --- 1 Summary -----------------------------------------------------------
  push(`## 1. ${r("summary.title")}`, "");
  push(
    r("summary.context", {
      orgType: v(`orgType.${report.organization.orgType}.label`),
      seats: report.organization.totalSeats,
      bucket: report.organization.sizeBucket,
      categories: report.targetStack.length,
    }),
    "",
    r("summary.target", {
      planned: report.roadmap.phases.reduce((sum, p) => sum + p.migrations.length, 0),
      keep: report.roadmap.keepForNow.length,
    }),
    "",
    r(`postureNarrative.${glance.migrationPosture}`),
    "",
    r(`aiNarrative.${glance.aiPosture}`),
  );
  blank();

  // --- 2 Advantages --------------------------------------------------------
  push(`## 2. ${r("advantages.title")}`, "", ...list(report.advantages, ctx));
  blank();

  // --- 3 Savings -----------------------------------------------------------
  push(`## 3. ${r("savings.title")}`, "");
  push(`**${r(`outlook.${report.savings.band}`)}**`, "");
  push(`### ${r("savings.drivers")}`, "", ...list(report.savings.drivers, ctx), "");
  push(`### ${r("savings.offsets")}`, "", ...list(report.savings.offsets, ctx), "");

  // The figures come after the band, never instead of it, and every one of them
  // is followed by the line that says where it came from (ADR-0003).
  const exposure = report.savings.subscriptionExposure;
  if (exposure) {
    // One figure, and a sentence for what the roadmap removes from it. A second
    // amount in a second row — the same number, labelled "entfällt" — is a net
    // saving in everything but the noun, and ADR-0003 forbids stating one.
    push(`### ${r("savings.exposureTitle")}`, "");
    push(`**${r("savings.exposureCurrent")}: ${money(exposure.annualCents)}**`, "");
    push(
      r("savings.exposureCoverage", {
        priced: exposure.categoriesPriced,
        assessed: exposure.categoriesAssessed,
        seats: exposure.seatsPriced,
      }),
      "",
    );
    const fallsAway =
      exposure.avoidedAnnualCents === 0
        ? r("savings.exposureFallsAwayNone")
        : exposure.avoidedAnnualCents >= exposure.annualCents
          ? r("savings.exposureFallsAwayAll")
          : r("savings.exposureFallsAwayPart", {
              amount: money(exposure.avoidedAnnualCents),
            });
    push(`${fallsAway} ${r("savings.exposureNote")}`, "");

    push(`#### ${r("savings.basisTitle")}`, "");
    for (const basis of exposure.basis) {
      push(`- ${escapeCell(basisLine(basis, exposure.currency, locale, t))}`);
      push(`  - ${r("savings.basisAnnual")}: ${money(basis.annualCents)}`);
      push(
        `  - ${r("savings.basisCovers")}: ${basis.categories.map(category).join(", ")}`,
      );
      if (!basis.fallsAway) {
        push(
          `  - ${r("savings.basisRemains", {
            categories: basis.remainingCategories.map(category).join(", "),
          })}`,
        );
      }
      push(`  - ${r("savings.basisSource")}: ${basis.source}`);
    }
    push("", ...list(exposure.notes, ctx), "");
  }

  push(...list(report.savings.modelLimitations, ctx));
  blank();

  // The cost of moving, beside the cost of staying (ADR-0004). Absent rather
  // than zero where no day rate was declared.
  push(`### ${r("cost.title")}`, "");
  if (report.cost.totalCents) {
    push(`| | | |`, `| --- | --- | --- |`);
    for (const [label, line] of [
      [r("cost.internalLabel"), report.cost.internal],
      [r("cost.externalLabel"), report.cost.external],
    ] as const) {
      if (!line) continue;
      push(
        `| ${label} | ${money(line.cents.min)} – ${money(line.cents.max)} | ${r(
          "cost.lineBasis",
          {
            minDays: line.days.min,
            maxDays: line.days.max,
            rate: money(line.rateCents),
          },
        )} |`,
      );
    }
    blank();
    push(
      r("cost.coverage", {
        migrations: report.cost.coverage.migrationsTotal,
        external: report.cost.coverage.externalSupportMigrations,
      }),
      "",
    );
  }
  push(...list(report.cost.notes, ctx), "");

  // --- 4 Target stack ------------------------------------------------------
  push(`## 4. ${r("stack.title")}`, "", r("stack.lead"), "");
  push(
    `| ${r("stack.current")} | → | ${r("stack.backups")} | ${r("glance.seats")} |`,
    `| --- | --- | --- | --- |`,
  );
  for (const entry of report.targetStack) {
    push(
      `| ${escapeCell(`${category(entry.category)}: ${entry.currentTool.name ?? r("stack.nothingInUse")}`)} | ${escapeCell(entry.recommended?.tool.name ?? r("stack.noViableTarget"))} | ${escapeCell(entry.backups.map((b) => b.tool.name).join(", ") || "—")} | ${entry.seats} |`,
    );
  }
  blank();

  /**
   * Fit criteria common to every recommendation, stated once rather than on
   * each of six cards. See the same computation in `report-view.tsx`, and the
   * reason it exists: about thirty bullets were carrying about five facts.
   */
  const recommendations = report.targetStack.filter((entry) => entry.recommended);
  const fitKey = (item: RationaleItem) =>
    `${item.code}::${JSON.stringify(item.params)}`;
  const sharedFit =
    recommendations.length > 1
      ? recommendations[0]!.recommended!.fitReasons.filter((item) =>
          recommendations.every((entry) =>
            entry.recommended!.fitReasons.some(
              (other) => fitKey(other) === fitKey(item),
            ),
          ),
        )
      : [];
  const sharedFitKeys = new Set(sharedFit.map(fitKey));

  if (sharedFit.length > 0) {
    push(
      `### ${r("stack.sharedFit", { count: recommendations.length })}`,
      "",
      ...list(sharedFit, ctx),
      "",
    );
  }

  for (const entry of report.targetStack) {
    push(`### ${category(entry.category)}`, "");
    if (entry.coverageDepth === "focused") {
      push(`_${r("stack.focusedCoverage")}_`, "");
    }
    if (entry.recommended) {
      push(
        `**${entry.recommended.tool.name}** — ${localized(entry.recommended.tool.summary, locale)}`,
        "",
      );
      const distinct = entry.recommended.fitReasons.filter(
        (item) => !sharedFitKeys.has(fitKey(item)),
      );
      if (distinct.length > 0) push(...list(distinct, ctx), "");
      if (entry.recommended.cautions.length > 0) {
        push(...list(entry.recommended.cautions, ctx), "");
      }
      push(localized(entry.recommended.tool.scalabilityNotes, locale), "");
    }
    if (entry.ruledOut.length > 0) {
      push(`_${r("stack.ruledOut", { count: entry.ruledOut.length })}_`, "");
      for (const { tool, reason } of entry.ruledOut) {
        push(
          `- **${tool.name}**: ${t(`rationale.${reason.code}`, localizeParams(reason.params, t, labels))}`,
        );
      }
      blank();
    }
  }

  // --- 5 Roadmap -----------------------------------------------------------
  push(`## 5. ${r("roadmap.title")}`, "", r("roadmap.lead"), "");
  for (const phase of report.roadmap.phases) {
    // An unoccupied phase is named rather than skipped: skipping left the
    // headings reading 0, 2, 3 with no way for a reader to resolve the gap.
    if (phase.migrations.length === 0 && phase.prerequisites.length === 0) {
      push(`### ${r(`phase.${phase.id}.title`)}`, "", r("roadmap.phaseEmpty"), "");
      continue;
    }

    push(`### ${r(`phase.${phase.id}.title`)}`, "");
    push(r(`phase.${phase.id}.goal`), "");
    push(
      `${r("roadmap.phaseSpan", {
        start: phase.duration.startMonth,
        end: phase.duration.endMonth,
      })} · ${dayRange(phase.effortDays)} · ${r("glance.seats")}: ${phase.affectedSeats}`,
      "",
    );

    for (const prerequisite of phase.prerequisites) {
      push(
        `- **${localized(prerequisite.label, locale)}** — ${localized(prerequisite.description, locale)}`,
      );
    }
    if (phase.prerequisites.length > 0) blank();

    for (const migration of phase.migrations) {
      push(
        `#### ${category(migration.category)} → ${migration.toolName}`,
        "",
        `${r(`difficulty.${migration.difficulty.label}`)} · ${dayRange(migration.effort.days)} · ${migration.seats} ${r("glance.seats")}${migration.pilotRecommended ? ` · ${r("roadmap.pilot")}` : ""}${migration.externalSupportLikely ? ` · ${r("roadmap.externalSupport")}` : ""}`,
        "",
        ...list(migration.reasons, ctx),
      );

      // What the range is made of, and why the move is as hard as it is. The
      // drivers were computed, carried in the document, and dropped by every
      // renderer including this one.
      if (migration.effort.items.length > 0) {
        blank();
        for (const item of migration.effort.items) {
          push(`- ${v(`workPackage.${item.package}.label`)}: ${dayRange(item.days)}`);
        }
      }
      if (migration.difficulty.drivers.length > 0) {
        push("", `${r("roadmap.whyThisHard")}`, "");
        push(...list(migration.difficulty.drivers, ctx));
      }

      if (migration.gotchas.length > 0) {
        push("", `${r("roadmap.watchOutFor")}`, "");
        for (const gotcha of migration.gotchas) push(`- ${t(`rationale.${gotcha}`)}`);
      }
      blank();
    }
  }

  // The client operating system, inside the roadmap because it is a roadmap
  // item: it has a phase, or a reason it has none.
  push(`### ${r("clientOs.title")}`, "");
  push(
    report.clientOs.phase !== null
      ? r("clientOs.scheduledIn", { phase: r(`phase.${report.clientOs.phase}.title`) })
      : r("clientOs.notScheduled"),
    "",
  );
  if (report.clientOs.effortDays && report.clientOs.devices) {
    push(
      `${dayRange(report.clientOs.effortDays)} · ${r(
        report.clientOs.devices.source === "declared"
          ? "clientOs.devicesDeclared"
          : "clientOs.devicesFromSeats",
        { count: report.clientOs.devices.count },
      )}`,
      "",
    );
  }
  push(...list([...report.clientOs.blockers, ...report.clientOs.cautions], ctx));
  if (report.clientOs.gates.length > 0) {
    push("", `**${r("clientOs.gatesTitle")}**`, "");
    for (const gate of report.clientOs.gates) {
      push(
        `- **${localized(gate.label, locale)}** ${r(`clientOs.gate_${gate.status}`)} — ${localized(gate.description, locale)}`,
      );
    }
  }
  push("", ...list(report.clientOs.reasons, ctx));
  blank();

  if (report.roadmap.keepForNow.length > 0) {
    push(`### ${r("roadmap.keepForNow")}`, "", r("roadmap.keepForNowLead"), "");
    for (const deferred of report.roadmap.keepForNow) {
      push(
        `- **${category(deferred.category)}**${deferred.currentToolName ? ` (${deferred.currentToolName})` : ""}: ${t(`rationale.${deferred.reason.code}`, localizeParams(deferred.reason.params, t, labels))} ${t(`rationale.${deferred.revisitWhen}`)}`,
      );
    }
    blank();
  }

  // --- 6 Capacity ----------------------------------------------------------
  push(`## 6. ${r("capacity.title")}`, "", r("capacity.lead"), "");
  push(`| | | |`, `| --- | --- | --- |`);
  for (const [key, band] of [
    ["opsCapability", report.readiness.opsCapability],
    ["changeCapacity", report.readiness.changeCapacity],
    ["identityReadiness", report.readiness.identityReadiness],
    ["aiReadiness", report.readiness.aiReadiness],
  ] as const) {
    push(
      `| ${r(`readinessBand.${key}`)} | ${r(`readinessLabel.${band.label}`)} | ${band.score}/100 |`,
    );
  }
  blank();
  push(
    r("capacity.budgetLine", {
      min: report.capacity.totalEffortDays.min,
      max: report.capacity.totalEffortDays.max,
      availableMin: report.capacity.availablePerYear.min,
      availableMax: report.capacity.availablePerYear.max,
    }),
    "",
    `_${r("capacity.estimateNote")}_`,
    "",
  );
  if (report.readiness.gaps.length > 0) {
    push(`### ${r("capacity.gaps")}`, "", ...list(report.readiness.gaps, ctx), "");
  }
  if (report.capacity.gaps.length > 0) {
    push(...list(report.capacity.gaps, ctx), "");
  }

  // --- 7 AI ----------------------------------------------------------------
  push(`## 7. ${r("ai.title")}`, "", r("ai.lead"), "");
  for (const recommendation of report.aiLane.recommendations) {
    push(
      `### ${localized(recommendation.label, locale)} — ${r(`aiTiming.${recommendation.timing}`)}`,
      "",
      localized(recommendation.description, locale),
      "",
    );
    if (recommendation.deployment) {
      push(`**${localized(recommendation.deployment.label, locale)}**`, "");
    }
    push(...list(recommendation.reasons, ctx), "");
    push(localized(recommendation.governanceNotes, locale), "");
    push(...list(recommendation.risks, ctx), "");
  }
  push(...list(report.aiLane.notes, ctx));
  blank();

  // --- 8 Scalability -------------------------------------------------------
  push(`## 8. ${r("scalability.title")}`, "", r("scalability.lead"), "");
  for (const key of [
    "currentSize",
    "growth",
    "moreDepartments",
    "stricterGovernance",
    "broaderAi",
    "selfHostingMaturity",
  ] as const) {
    push(
      `**${r(`scalability.${key}`)}**`,
      "",
      ...list(report.scalability[key], ctx),
      "",
    );
  }

  // --- 9 Next steps --------------------------------------------------------
  push(`## 9. ${r("next.title")}`, "");
  for (const [key, items] of [
    ["immediate", report.nextSteps.immediate],
    ["within30Days", report.nextSteps.within30Days],
    ["pilots", report.nextSteps.pilots],
    ["cautionFlags", report.nextSteps.cautionFlags],
  ] as const) {
    if (items.length === 0) continue;
    push(`### ${r(`next.${key}`)}`, "", ...list(items, ctx), "");
  }

  // --- Method --------------------------------------------------------------
  push(`## ${r("method.title")}`, "", r("method.lead"), "");
  push(`### ${r("method.notModelled")}`, "");
  for (const code of report.method.notModelled) push(`- ${t(`rationale.${code}`)}`);
  blank();

  if (report.method.unassessedCategories.length > 0) {
    push(
      `**${r("method.notAssessed")}**: ${report.method.unassessedCategories.map(category).join(", ")}`,
      "",
    );
  }
  if (report.method.dataQualityNotes.length > 0) {
    push(
      `### ${r("method.dataQuality")}`,
      "",
      ...list(report.method.dataQualityNotes, ctx),
      "",
    );
  }

  push(
    "---",
    "",
    r("method.footer", {
      engineVersion: report.engineVersion,
      rulepackVersion: report.rulepackVersion,
    }),
    "",
    r("method.linkNotice"),
  );

  // Collapse runs of blank lines so the output reads cleanly when pasted.
  return (
    out
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trimEnd() + "\n"
  );
}
