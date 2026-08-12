import { afterAll, describe, expect, it } from "vitest";
import { loadReport, saveAssessment } from "@/lib/assessments";
import { db } from "@/lib/db";
import { CURRENT_RULEPACK_VERSION } from "@/rulepack";
import { persona } from "../fixtures/personas";

/**
 * Round-trips a real assessment through SQLite.
 *
 * Runs against the development database and removes what it creates. The point
 * is to prove that a stored assessment reconstitutes into the same report, since
 * that is the whole basis for not persisting the report itself.
 */

const created: string[] = [];

afterAll(async () => {
  if (created.length > 0) {
    await db.assessment.deleteMany({ where: { id: { in: created } } });
  }
});

async function store(id = "municipality-180") {
  const newId = await saveAssessment(persona(id).input);
  created.push(newId);
  return newId;
}

describe("assessment persistence", () => {
  it("stores an assessment and reconstitutes its report", async () => {
    const id = await store();
    const loaded = await loadReport(id);

    expect(loaded).not.toBeNull();
    expect(loaded!.id).toBe(id);
    expect(loaded!.report.organization.totalSeats).toBe(180);
    expect(loaded!.report.targetStack.length).toBeGreaterThan(0);
  });

  it("produces an unguessable id", async () => {
    const id = await store();
    expect(id).toHaveLength(21);
    expect(id).not.toMatch(/^\d+$/);
  });

  it("records the rulepack the assessment was taken against", async () => {
    const id = await store();
    const loaded = await loadReport(id);

    expect(loaded!.assessmentRulepackVersion).toBe(CURRENT_RULEPACK_VERSION);
    expect(loaded!.rulesChangedSinceAssessment).toBe(false);
  });

  it("regenerates the identical report on every load", async () => {
    // This is what justifies not storing the report: recomputing it is stable.
    const id = await store();
    const first = await loadReport(id);
    const second = await loadReport(id);

    expect(JSON.stringify(first!.report)).toBe(JSON.stringify(second!.report));
  });

  it("returns null for an unknown id rather than throwing", async () => {
    expect(await loadReport("does-not-exist-000000")).toBeNull();
  });

  it("stores only the answers, never the derived report", async () => {
    const id = await store();
    const row = await db.assessment.findUniqueOrThrow({ where: { id } });
    const payload = JSON.stringify(row.payload);

    expect(payload).toContain("municipality");
    // None of these exist in the intake; they are all derived at render time.
    expect(payload).not.toContain("atAGlance");
    expect(payload).not.toContain("readiness");
    expect(payload).not.toContain("roadmap");
  });

  it("keeps anonymous hints for aggregate insight without storing identity", async () => {
    const id = await store();
    const row = await db.assessment.findUniqueOrThrow({ where: { id } });

    expect(row.orgTypeHint).toBe("municipality");
    expect(row.seatsHint).toBe(180);
  });
});
