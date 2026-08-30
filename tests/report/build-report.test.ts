import { describe, expect, it } from "vitest";
import { runEngine } from "@/engine";
import { buildReport } from "@/report/build-report";
import { parsePlanningReport } from "@/report/schema";
import { currentRulepack, getRulepack } from "@/rulepack";
import { PERSONAS, persona } from "../fixtures/personas";
import type { PlanningReport } from "@/report/schema";

const pack = currentRulepack();

/** Fixed timestamp: the composer takes it as input so fixtures stay stable. */
const GENERATED_AT = "2026-08-12T00:00:00.000Z";

function report(id: string): PlanningReport {
  const { input } = persona(id);
  return buildReport(runEngine(input, pack), pack, { generatedAt: GENERATED_AT });
}

describe("planning report", () => {
  it.each(PERSONAS.map((p) => [p.id] as const))(
    "produces a schema-valid report for %s",
    (id) => {
      expect(() => parsePlanningReport(report(id))).not.toThrow();
    },
  );

  it.each(PERSONAS.map((p) => [p.id] as const))(
    "produces byte-identical output across runs for %s",
    (id) => {
      expect(JSON.stringify(report(id))).toBe(JSON.stringify(report(id)));
    },
  );

  it("survives a serialization round trip", () => {
    // The document has to be plain JSON — no Maps, no class instances — so a
    // renderer or a future PDF service can consume it unchanged.
    const original = report("municipality-180");
    const roundTripped = JSON.parse(JSON.stringify(original));
    expect(roundTripped).toEqual(original);
  });

  it("carries money as data, never as formatted text", () => {
    for (const { id } of PERSONAS) {
      // Renderers format; the document does not. A formatted amount in here is
      // one that has been separated from the plan, source and date that make it
      // checkable — see ADR-0003.
      expect(JSON.stringify(report(id))).not.toMatch(/€/);
    }
  });

  it("never states a figure without the basis needed to check it", () => {
    for (const { id } of PERSONAS) {
      const exposure = report(id).savings.subscriptionExposure;
      if (!exposure) continue;

      expect(exposure.basis.length).toBeGreaterThan(0);
      for (const basis of exposure.basis) {
        expect(basis.planName.length).toBeGreaterThan(0);
        expect(basis.source).toMatch(/^https:\/\//);
        expect(basis.observedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }

      // Coverage travels with the sum, always.
      expect(exposure.categoriesAssessed).toBeGreaterThanOrEqual(
        exposure.categoriesPriced,
      );
      // Gross exposure only. Never a net saving.
      expect(exposure.avoidedAnnualCents).toBeLessThanOrEqual(exposure.annualCents);
    }
  });

  it("always declares what it does not model", () => {
    for (const { id } of PERSONAS) {
      const method = report(id).method;
      expect(method.notModelled.length).toBeGreaterThan(0);
      expect(method.notModelled).toContain(
        "method.not_modelled.legal_retention_duties",
      );
      expect(method.inputsUsed.length).toBeGreaterThan(10);
    }
  });

  it("flags that the rulepack is unverified while entries remain draft", () => {
    expect(report("municipality-180").rulepackIsDraft).toBe(true);
  });

  it("records both versions so a report can be reproduced", () => {
    const doc = report("municipality-180");
    expect(doc.engineVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(doc.rulepackVersion).toBe(pack.version);
    expect(doc.generatedAt).toBe(GENERATED_AT);
  });
});

describe("the four outputs that prove this is a plan", () => {
  it("says what to keep for now, with a condition to revisit", () => {
    // The 900-person SME rates its CRM low-pain, no-urgency: replacing
    // Salesforce is not this year's problem, and saying so is the useful answer.
    const doc = report("sme-900");
    expect(doc.roadmap.keepForNow.length).toBeGreaterThan(0);
    for (const deferred of doc.roadmap.keepForNow) {
      expect(deferred.reason.code).toMatch(/^keep\./);
      expect(deferred.revisitWhen).toMatch(/^revisit\./);
    }
  });

  it("shows what was considered and ruled out, with the reason", () => {
    const doc = report("school-45");
    const withRuledOut = doc.targetStack.filter((entry) => entry.ruledOut.length > 0);

    expect(withRuledOut.length).toBeGreaterThan(0);
    for (const entry of withRuledOut) {
      for (const { tool, reason } of entry.ruledOut) {
        expect(tool.name).toBeTruthy();
        expect(reason.code).toMatch(/^blocker\./);
        expect(reason.evidence.length).toBeGreaterThan(0);
      }
    }
  });

  it("states capacity gaps rather than a plan nobody can carry out", () => {
    const doc = report("association-14");
    expect(doc.capacity.totalEffortDays.max).toBeGreaterThan(0);
    expect(doc.capacity.availablePerYear.max).toBeGreaterThan(0);
  });

  it("explains why an AI use case is not yet", () => {
    // The school has office PCs and highly sensitive data.
    const doc = report("school-45");
    const deferred = doc.aiLane.recommendations.filter((r) => r.timing === "later");

    for (const recommendation of deferred) {
      expect(recommendation.reasons.length).toBeGreaterThan(0);
      expect(recommendation.reasons.some((r) => r.severity === "caution")).toBe(true);
    }
  });
});

describe("report content", () => {
  it("carries an at-a-glance summary that stands alone", () => {
    for (const { id } of PERSONAS) {
      const glance = report(id).atAGlance;
      expect(glance.readiness.score).toBeGreaterThanOrEqual(0);
      expect(["prepare_first", "start_selectively", "proceed"]).toContain(
        glance.migrationPosture,
      );
      expect(["low", "moderate", "strong"]).toContain(glance.savingsOutlook);
      expect(["not_now", "start_small", "proceed"]).toContain(glance.aiPosture);
    }
  });

  it("keeps a small association out of 'proceed' posture", () => {
    // Fourteen people, no IT staff, nobody able to run Linux. The stack being
    // right does not make the organization ready, and the posture must say so.
    expect(report("association-14").atAGlance.migrationPosture).not.toBe("proceed");
  });

  it("marks CRM and DMS as narrower coverage where they appear", () => {
    const doc = report("municipality-180");
    const dms = doc.targetStack.find((entry) => entry.category === "dms_archive");
    expect(dms?.coverageDepth).toBe("focused");
  });

  it("names the current tool so the reader recognizes their own situation", () => {
    const doc = report("municipality-180");
    const files = doc.targetStack.find((entry) => entry.category === "file_sharing");
    expect(files?.currentTool.name).toBe("SharePoint / OneDrive");
  });

  it("carries the warnings specific to each move", () => {
    const doc = report("municipality-180");
    const migrations = doc.roadmap.phases.flatMap((phase) => phase.migrations);
    expect(migrations.some((migration) => migration.gotchas.length > 0)).toBe(true);
  });

  it("gives every phase an effort range and a seat count", () => {
    const doc = report("utility-600");
    for (const phase of doc.roadmap.phases) {
      expect(phase.effortDays.max).toBeGreaterThanOrEqual(phase.effortDays.min);
      expect(phase.affectedSeats).toBeGreaterThanOrEqual(0);
    }
  });

  it("derives advantages from the stack actually recommended", () => {
    const doc = report("municipality-180");
    expect(doc.advantages.length).toBeGreaterThan(0);
    for (const advantage of doc.advantages) {
      expect(advantage.code).toMatch(/^advantage\./);
    }
  });

  it("answers whether the stack still holds as the organization changes", () => {
    const doc = report("sme-900");
    for (const key of [
      "currentSize",
      "growth",
      "moreDepartments",
      "stricterGovernance",
      "broaderAi",
      "selfHostingMaturity",
    ] as const) {
      expect(doc.scalability[key].length).toBeGreaterThan(0);
      expect(doc.scalability[key][0]!.code).toMatch(/^scale\./);
    }
  });

  it("ends with concrete next steps", () => {
    const doc = report("municipality-180");
    expect(doc.nextSteps.immediate.length).toBeGreaterThan(0);
    expect(doc.nextSteps.within30Days.length).toBeGreaterThan(0);
  });

  it("cites sources for every recommended tool", () => {
    for (const { id } of PERSONAS) {
      for (const entry of report(id).targetStack) {
        if (!entry.recommended) continue;
        expect(entry.recommended.tool.sources.length).toBeGreaterThan(0);
      }
    }
  });
});

/**
 * The promise that makes a released rulepack immutable worth anything.
 *
 * `src/rulepack/index.ts` says a correction ships as a new version rather than a
 * silent edit, because a report regenerated next month must not disagree with
 * the printed copy in someone's folder. v2026-09 added Euro-Office and list
 * prices; this is what proves it added them to a new pack rather than to the old
 * one.
 */
describe("a plan taken against an older rulepack", () => {
  it("renders against its own pack, untouched by later ones", () => {
    const older = getRulepack("v2026-08");
    const input = persona("municipality-180").input;
    const render = () =>
      buildReport(runEngine(input, older), older, { generatedAt: GENERATED_AT });

    const report = render();
    expect(report.rulepackVersion).toBe("v2026-08");

    // Neither addition existed when that plan was made, so neither appears in it.
    expect(JSON.stringify(report)).not.toContain("euro-office");
    expect(report.savings.subscriptionExposure).toBeNull();
    expect(JSON.stringify(report)).not.toMatch(/€/);

    expect(JSON.stringify(render())).toBe(JSON.stringify(report));
  });
});

/**
 * Definition of done, item 5: "Removing the rulepack breaks the build — no
 * recommendation is hardcoded in UI."
 *
 * It was the only item on that list with nothing automated behind it, checked
 * until now by remembering to grep. The property is worth holding: the moment a
 * tool name is typed into a renderer, lokal is quietly asserting something the
 * rulepack has not sourced, dated or reviewed — which is the whole basis on
 * which this tool asks to be believed.
 *
 * Asserted over the document rather than over the components, because the
 * document is what every renderer draws from. A name that reaches a reader
 * reaches them through here.
 */
describe("no recommendation is hardcoded", () => {
  it("names only tools the rulepack knows about", () => {
    const pack = currentRulepack();
    const known = new Set([
      ...pack.targetTools.map((tool) => tool.name),
      ...pack.sourceTools.map((tool) => tool.name),
    ]);

    for (const { id } of PERSONAS) {
      const document = report(id);

      const named = [
        ...document.targetStack.flatMap((entry) => [
          entry.recommended?.tool.name,
          ...entry.backups.map((backup) => backup.tool.name),
          ...entry.ruledOut.map((candidate) => candidate.tool.name),
        ]),
        ...document.roadmap.phases.flatMap((phase) =>
          phase.migrations.map((migration) => migration.toolName),
        ),
      ].filter((name): name is string => typeof name === "string");

      // A persona that recommends nothing would pass this vacuously.
      expect({ id, named: named.length > 0 }).toEqual({ id, named: true });

      for (const name of named) {
        expect({ id, name, fromRulepack: known.has(name) }).toEqual({
          id,
          name,
          fromRulepack: true,
        });
      }
    }
  });

  it("cites a source for every tool it recommends", () => {
    for (const { id } of PERSONAS) {
      for (const entry of report(id).targetStack) {
        if (!entry.recommended) continue;
        expect({
          id,
          tool: entry.recommended.tool.name,
          sourced: entry.recommended.tool.sources.length > 0,
        }).toEqual({ id, tool: entry.recommended.tool.name, sourced: true });
      }
    }
  });
});
