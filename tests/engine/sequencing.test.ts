import { describe, expect, it } from "vitest";
import { selectStack } from "@/engine/candidates";
import { assessDifficulty, seatPressure } from "@/engine/difficulty";
import { normalize } from "@/engine/normalize";
import { assessReadiness } from "@/engine/readiness";
import { sequence } from "@/engine/sequencing";
import { currentRulepack } from "@/rulepack";
import { assessment, type AssessmentOverrides } from "../fixtures/build";
import type { CategoryId } from "@/domain/enums";
import type { MigrationDifficulty } from "@/engine/difficulty";

const pack = currentRulepack();

function plan(overrides: AssessmentOverrides = {}) {
  const normalized = normalize(assessment(overrides));
  const readiness = assessReadiness(normalized);
  const recommendations = selectStack(normalized, readiness, pack);

  const difficulties = new Map<CategoryId, MigrationDifficulty>(
    recommendations.map((rec) => [
      rec.category,
      assessDifficulty(rec, normalized, readiness, pack),
    ]),
  );

  return {
    recommendations,
    difficulties,
    readiness,
    ...sequence(recommendations, difficulties, normalized, readiness, pack),
  };
}

describe("migration difficulty", () => {
  it("steps seat pressure rather than scaling it linearly", () => {
    // The jump happens when a migration stops being absorbable by a small group.
    expect(seatPressure(10)).toBe(0);
    expect(seatPressure(30)).toBeGreaterThan(seatPressure(10));
    expect(seatPressure(600)).toBeGreaterThan(seatPressure(80));

    // Within a band, extra seats change nothing: 600 and 1900 people are the
    // same kind of problem. Crossing into the next band is what costs.
    expect(seatPressure(1900)).toBe(seatPressure(600));
    expect(seatPressure(2500)).toBeGreaterThan(seatPressure(1900));
  });

  it("never decreases when seats increase", () => {
    const at = (seats: number) => {
      const p = plan({
        categories: ["file_sharing"],
        totalSeats: seats,
        categorySeats: seats,
      });
      return p.difficulties.get("file_sharing")!.score;
    };
    const scores = [10, 60, 200, 900].map(at);
    for (let i = 1; i < scores.length; i += 1) {
      expect(scores[i]!).toBeGreaterThanOrEqual(scores[i - 1]!);
    }
  });

  it("never decreases when a system becomes business-critical", () => {
    const low = plan({ categories: ["helpdesk"], criticality: "low" });
    const high = plan({ categories: ["helpdesk"], criticality: "high" });

    expect(high.difficulties.get("helpdesk")!.score).toBeGreaterThanOrEqual(
      low.difficulties.get("helpdesk")!.score,
    );
  });

  it("carries the warnings specific to the move being made", () => {
    // Teams to Matrix: chat history is not portable and Teams doubles as file
    // storage. Generic advice would miss both.
    const p = plan({
      categories: ["chat_video"],
      supportExpectation: "community_tolerant",
    });
    const difficulty = p.difficulties.get("chat_video")!;

    if (difficulty.edge?.from === "microsoft-teams") {
      expect(difficulty.gotchas).toContain("gotcha.chat_history_not_portable");
    }
    expect(difficulty.drivers.length).toBeGreaterThan(0);
  });

  it("stays within 1 and 5", () => {
    const p = plan({
      categories: ["file_sharing", "chat_video", "helpdesk", "dms_archive"],
      totalSeats: 20_000,
      categorySeats: 20_000,
      criticality: "high",
      trainingSensitivity: "high",
      identityMaturity: "low",
      supportExpectation: "community_tolerant",
    });

    for (const difficulty of p.difficulties.values()) {
      expect(difficulty.score).toBeGreaterThanOrEqual(1);
      expect(difficulty.score).toBeLessThanOrEqual(5);
    }
  });
});

describe("sequencing", () => {
  it("puts prerequisites in phase 0 before anything depends on them", () => {
    const p = plan({ categories: ["file_sharing", "chat_video"] });
    const phaseZero = p.phases.find((phase) => phase.id === 0)!;

    expect(phaseZero.prerequisites.length).toBeGreaterThan(0);
    expect(phaseZero.migrations).toHaveLength(0);

    // Everything a later phase needs must be listed in phase 0.
    const scheduled = p.phases.flatMap((phase) => phase.migrations);
    const required = new Set(
      scheduled.flatMap((m) => m.recommendation.primary?.tool.prerequisites ?? []),
    );
    const listed = new Set(
      phaseZero.prerequisites.map((prerequisite) => prerequisite.id),
    );
    for (const id of required) {
      expect(listed).toContain(id);
    }
  });

  it("schedules quick wins before complex work", () => {
    const p = plan({
      categories: ["file_sharing", "dms_archive"],
      supportExpectation: "community_tolerant",
    });

    for (const phase of p.phases) {
      for (const migration of phase.migrations) {
        if (phase.id === 1) expect(migration.difficulty.score).toBeLessThan(4);
      }
    }
  });

  it("explains why each migration sits where it does", () => {
    const p = plan({ categories: ["file_sharing", "helpdesk"] });
    for (const phase of p.phases) {
      for (const migration of phase.migrations) {
        expect(migration.reasons.length).toBeGreaterThan(0);
        expect(migration.reasons[0]!.code).toMatch(/^phase\./);
      }
    }
  });

  it("spreads business-critical migrations when change capacity is weak", () => {
    const p = plan({
      categories: ["file_sharing", "chat_video", "helpdesk", "intranet_wiki"],
      criticality: "high",
      itMaturity: "low",
      adminCapacity: "low",
      totalSeats: 900,
      supportExpectation: "community_tolerant",
    });

    // A weak-change-capacity organization should never be handed a phase with
    // several simultaneous business-critical cutovers.
    for (const phase of p.phases) {
      const critical = phase.migrations.filter(
        (m) => m.recommendation.entry.criticality === "high",
      );
      if (phase.id < 3) expect(critical.length).toBeLessThanOrEqual(1);
    }
  });

  it("never schedules a migration before the one it depends on", () => {
    // Nextcloud Talk runs on a file platform. A plan that switches on chat in
    // phase 1 while the platform it needs arrives in phase 3 is internally
    // consistent on paper and impossible in practice.
    const p = plan({
      categories: ["file_sharing", "chat_video"],
      criticality: "high",
      pain: "high",
      urgency: "now",
    });

    const byCategory = new Map(
      p.phases.flatMap((phase) => phase.migrations).map((m) => [m.category, m]),
    );
    const files = byCategory.get("file_sharing");
    const chat = byCategory.get("chat_video");

    if (files && chat && chat.recommendation.primary?.tool.ecosystem === "nextcloud") {
      expect(chat.phase).toBeGreaterThan(files.phase);
      expect(chat.reasons.map((r) => r.code)).toContain("phase.waits_for_dependency");
    }
  });

  it("says what to keep for now instead of scheduling everything", () => {
    const p = plan({
      categories: ["file_sharing", "dms_archive"],
      pain: "low",
      urgency: "later",
    });

    expect(p.keepForNow.length).toBeGreaterThan(0);
    for (const deferred of p.keepForNow) {
      expect(deferred.reason.code).toMatch(/^keep\./);
      expect(deferred.revisitWhen).toMatch(/^revisit\./);
    }
  });

  it("does not defer something that is both painful and urgent", () => {
    const p = plan({
      categories: ["file_sharing"],
      pain: "high",
      urgency: "now",
    });
    expect(p.keepForNow.map((d) => d.category)).not.toContain("file_sharing");
  });

  it("keeps a category with no viable target rather than pretending otherwise", () => {
    const p = plan({
      categories: ["dms_archive"],
      totalSeats: 40_000,
      categorySeats: 40_000,
    });

    expect(p.keepForNow.map((d) => d.category)).toContain("dms_archive");
    expect(p.keepForNow[0]!.reason.code).toBe("keep.no_suitable_target_yet");
  });

  it("counts affected seats per phase", () => {
    const p = plan({ categories: ["file_sharing", "helpdesk"], categorySeats: 120 });
    const total = p.phases.reduce((sum, phase) => sum + phase.affectedSeats, 0);
    const scheduled = p.phases.flatMap((phase) => phase.migrations).length;

    expect(total).toBe(scheduled * 120);
  });

  it("always produces all five phases, even when some are empty", () => {
    const p = plan({ categories: ["file_sharing"] });
    expect(p.phases.map((phase) => phase.id)).toEqual([0, 1, 2, 3, 4]);
  });

  it("is deterministic", () => {
    const run = () =>
      JSON.stringify(
        plan({ categories: ["file_sharing", "helpdesk", "chat_video"] }).phases,
      );
    expect(run()).toBe(run());
  });
});
