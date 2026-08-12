import { describe, expect, it } from "vitest";
import { runEngine } from "@/engine";
import { currentRulepack } from "@/rulepack";
import { assessment, type AssessmentOverrides } from "../fixtures/build";

const pack = currentRulepack();
const run = (overrides: AssessmentOverrides = {}) =>
  runEngine(assessment(overrides), pack);

/** Every rationale code the engine emitted, flattened. */
function allCodes(result: ReturnType<typeof run>): string[] {
  return (
    JSON.stringify(result)
      .match(/"code":"[^"]+"/g)
      ?.map((match) => match.slice(8, -1)) ?? []
  );
}

describe("capacity", () => {
  it("confronts the plan with the time actually available", () => {
    const result = run({
      categories: ["file_sharing", "chat_video", "helpdesk", "intranet_wiki"],
      adminCapacity: "low",
      totalSeats: 900,
      categorySeats: 900,
      supportExpectation: "community_tolerant",
    });

    expect(result.capacity.total.max).toBeGreaterThan(0);
    expect(result.capacity.availablePerYear.max).toBe(20);
    expect(result.capacity.gaps.map((g) => g.code)).toContain(
      "capacity.plan_exceeds_annual_capacity",
    );
  });

  it("does not cry wolf when capacity is ample", () => {
    const result = run({
      categories: ["forms_surveys"],
      adminCapacity: "high",
      totalSeats: 40,
      categorySeats: 40,
    });

    expect(result.capacity.gaps.map((g) => g.code)).not.toContain(
      "capacity.plan_exceeds_annual_capacity",
    );
  });

  it("recommends a pilot where a rollout would be risky", () => {
    const result = run({
      categories: ["office_docs"],
      totalSeats: 600,
      categorySeats: 600,
      trainingSensitivity: "high",
    });

    expect(result.capacity.pilotsRecommended).toContain("office_docs");
  });

  it("expresses effort as ranges, never single figures", () => {
    const result = run({ categories: ["file_sharing", "helpdesk"] });
    for (const phase of result.capacity.perPhase) {
      expect(phase.days.max).toBeGreaterThanOrEqual(phase.days.min);
      for (const effort of phase.efforts) {
        expect(effort.days.max).toBeGreaterThan(effort.days.min);
      }
    }
  });

  it("counts groundwork in phase 0 as real work", () => {
    const result = run({ categories: ["file_sharing", "chat_video"] });
    const phaseZero = result.capacity.perPhase.find((p) => p.phase === 0)!;
    expect(phaseZero.days.min).toBeGreaterThan(0);
  });
});

describe("savings outlook", () => {
  it("returns a qualitative band with drivers and offsets", () => {
    const result = run({ categories: ["file_sharing", "office_docs"] });

    expect(["low", "moderate", "strong"]).toContain(result.savings.band);
    expect(result.savings.drivers.length).toBeGreaterThan(0);
    expect(result.savings.offsets.length).toBeGreaterThan(0);
  });

  it("always states what the model does not account for", () => {
    const result = run({});
    expect(result.savings.modelLimitations.map((l) => l.code)).toContain(
      "savings.model_is_qualitative",
    );
  });

  it("rates displacing heavily locked-in seats higher than lightly locked-in ones", () => {
    const lockedIn = run({
      categories: ["file_sharing"],
      supportExpectation: "community_tolerant",
    });
    // A plain file server carries far less recurring exposure than SharePoint.
    const loose = runEngine(
      {
        ...assessment({
          categories: ["file_sharing"],
          supportExpectation: "community_tolerant",
        }),
        stack: [
          {
            ...assessment({ categories: ["file_sharing"] }).stack[0]!,
            currentTool: { kind: "known", id: "windows-file-server" },
          },
        ],
      },
      pack,
    );

    const rank = { low: 0, moderate: 1, strong: 2 };
    expect(rank[lockedIn.savings.band]).toBeGreaterThanOrEqual(
      rank[loose.savings.band],
    );
  });

  it("names the parallel-running cost when the plan spans several phases", () => {
    const result = run({
      categories: ["file_sharing", "chat_video", "helpdesk", "dms_archive"],
      supportExpectation: "community_tolerant",
    });

    if (result.savings.parallelRunPhases > 1) {
      expect(result.savings.offsets.map((o) => o.code)).toContain(
        "savings.parallel_running_costs",
      );
    }
  });
});

describe("local-AI lane", () => {
  it("defers a use case the hardware cannot support, with a reason", () => {
    const result = run({
      aiInterest: "active",
      hardwareProfile: "office_pcs",
      aiUseCases: ["knowledge_assistant"],
    });

    const assistant = result.aiLane.recommendations[0]!;
    expect(assistant.timing).toBe("later");
    expect(assistant.reasons.map((r) => r.code)).toContain(
      "ai.hardware_below_requirement",
    );
  });

  it("defers document questions when no document store is planned first", () => {
    // Only a helpdesk migration: nothing to ask questions of.
    const result = run({
      categories: ["helpdesk"],
      aiInterest: "active",
      hardwareProfile: "gpu_capable",
      dataSensitivity: "low",
      aiUseCases: ["document_qa"],
    });

    const docQa = result.aiLane.recommendations[0]!;
    expect(docQa.timing).toBe("later");
    expect(docQa.reasons.map((r) => r.code)).toContain(
      "ai.needs_a_document_store_first",
    );
  });

  it("allows document questions once a document store is on the roadmap", () => {
    const result = run({
      categories: ["file_sharing"],
      aiInterest: "active",
      hardwareProfile: "gpu_capable",
      dataSensitivity: "low",
      aiUseCases: ["document_qa"],
      supportExpectation: "community_tolerant",
    });

    const docQa = result.aiLane.recommendations[0]!;
    expect(docQa.reasons.map((r) => r.code)).not.toContain(
      "ai.needs_a_document_store_first",
    );
  });

  it("picks the most sovereign posture that can carry the data", () => {
    const result = run({
      aiInterest: "active",
      hardwareProfile: "server",
      dataSensitivity: "high",
      aiUseCases: ["summarization"],
    });

    const summary = result.aiLane.recommendations[0]!;
    expect(summary.deployment).not.toBeNull();
    expect(summary.deployment!.posture).not.toBe("eu_hosted");
  });

  it("attaches a human-review expectation to every use case", () => {
    const result = run({
      aiInterest: "active",
      hardwareProfile: "gpu_capable",
      aiUseCases: ["summarization", "drafting", "ticket_triage"],
    });

    for (const recommendation of result.aiLane.recommendations) {
      expect(recommendation.risks.map((r) => r.code).join(" ")).toMatch(/^ai\.review_/);
    }
  });

  it("says nothing rather than inventing a lane when there is no interest", () => {
    const result = run({ aiInterest: "none", aiUseCases: [] });
    expect(result.aiLane.recommendations).toHaveLength(0);
    expect(result.aiLane.posture).toBe("not_now");
  });
});

describe("runEngine", () => {
  it("produces byte-identical output across runs", () => {
    const once = JSON.stringify(run({ categories: ["file_sharing", "helpdesk"] }));
    const twice = JSON.stringify(run({ categories: ["file_sharing", "helpdesk"] }));
    expect(once).toBe(twice);
  });

  it("records both the engine and the rulepack version", () => {
    const result = run({});
    expect(result.engineVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(result.rulepackVersion).toBe(pack.version);
  });

  it("never states a currency amount", () => {
    const result = run({
      categories: ["file_sharing", "office_docs", "chat_video", "helpdesk"],
      aiInterest: "active",
      hardwareProfile: "gpu_capable",
      aiUseCases: ["summarization", "document_qa"],
    });

    expect(JSON.stringify(result)).not.toMatch(/€|\bEUR\b/);
  });

  it("attaches at least one rationale to every recommendation", () => {
    const result = run({ categories: ["file_sharing", "helpdesk", "chat_video"] });

    for (const recommendation of result.recommendations) {
      if (!recommendation.primary) continue;
      expect(recommendation.primary.fitReasons.length).toBeGreaterThan(0);
    }
    for (const phase of result.sequencing.phases) {
      for (const migration of phase.migrations) {
        expect(migration.reasons.length).toBeGreaterThan(0);
      }
    }
  });

  it("uses only structured codes, never prose", () => {
    // Every code must look like a key, not a sentence. This is the guarantee
    // that keeps the engine translatable and free of embedded English.
    for (const code of allCodes(
      run({ aiInterest: "active", aiUseCases: ["summarization"] }),
    )) {
      expect(code).toMatch(/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/);
    }
  });

  it("handles the smallest plausible organization", () => {
    const result = run({
      orgType: "association",
      publicSector: false,
      totalSeats: 4,
      categorySeats: 4,
      categories: ["file_sharing"],
      departments: [],
      supportExpectation: "community_tolerant",
    });

    expect(result.sequencing.phases).toHaveLength(5);
    expect(result.readiness.overall.score).toBeGreaterThanOrEqual(0);
  });

  it("handles every category at once", () => {
    const result = run({
      categories: [
        "office_docs",
        "file_sharing",
        "chat_video",
        "intranet_wiki",
        "project_management",
        "helpdesk",
        "forms_surveys",
        "crm",
        "dms_archive",
      ],
      supportExpectation: "community_tolerant",
    });

    expect(result.recommendations).toHaveLength(9);
    const planned = result.sequencing.phases.flatMap((p) => p.migrations).length;
    expect(planned + result.sequencing.keepForNow.length).toBe(9);
  });
});
