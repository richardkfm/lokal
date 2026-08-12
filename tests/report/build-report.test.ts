import { describe, expect, it } from "vitest";
import { runEngine } from "@/engine";
import { buildReport } from "@/report/build-report";
import { parsePlanningReport } from "@/report/schema";
import { currentRulepack } from "@/rulepack";
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

  it("states no currency amount in any persona", () => {
    for (const { id } of PERSONAS) {
      expect(JSON.stringify(report(id))).not.toMatch(/€|\bEUR\b/);
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
