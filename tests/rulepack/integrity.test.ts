import { describe, expect, it } from "vitest";
import { findIntegrityProblems, validateRulepack } from "@/rulepack/integrity";
import { rulepackSchema } from "@/rulepack/schema";
import { CATEGORY_IDS } from "@/domain/enums";
import type { Rulepack } from "@/rulepack/schema";

const PROVENANCE = {
  lastReviewed: "2026-08-12",
  sources: ["https://example.org/docs"],
};

function target(id: string, category: string, overrides: object = {}) {
  return {
    id,
    category,
    name: id,
    summary: { de: "Beschreibung" },
    license: "agpl",
    hostingModes: ["self_hosted"],
    sovereignty: 4,
    maturity: 4,
    supportModel: "commercial_available",
    deMarketPresence: 3,
    germanUiQuality: 4,
    publicSectorFit: 3,
    selfHostOpsLoad: 3,
    migrationComplexityBase: 3,
    trainingLoad: 3,
    seatScalability: { comfortableUpTo: 1000, notes: { de: "Hinweis" } },
    coexistence: "good",
    rollbackDifficulty: 3,
    aiSuitability: { hasNativeAi: false, localAiFriendly: 3 },
    prerequisites: [],
    ...PROVENANCE,
    ...overrides,
  };
}

/** A structurally complete pack: every category declared and populated. */
function basePack() {
  return {
    version: "v2026-08",
    categories: CATEGORY_IDS.map((id, index) => ({
      id,
      label: { de: id },
      description: { de: id },
      coverageDepth: "full",
      displayOrder: index,
    })),
    sourceTools: [],
    targetTools: CATEGORY_IDS.map((id) =>
      target(`${id.replace(/_/g, "-")}-target`, id),
    ),
    migrationEdges: [],
    prerequisites: [],
    aiUseCases: [],
    aiDeployments: [],
    blockerRules: [],
  };
}

/**
 * The base pack with fields replaced. Returns `unknown` on purpose: the
 * validators take unknown, and keeping the override map untyped here avoids
 * widening the typed arrays that tests read from `basePack()`.
 */
function completePack(
  overrides: Partial<Record<keyof Rulepack, unknown>> = {},
): unknown {
  return { ...basePack(), ...overrides };
}

describe("rulepack schema", () => {
  it("accepts a structurally complete pack", () => {
    expect(() => validateRulepack(completePack())).not.toThrow();
  });

  it("rejects an entry without sources", () => {
    const pack = completePack({
      targetTools: [target("nextcloud", "file_sharing", { sources: [] })],
    });
    expect(rulepackSchema.safeParse(pack).success).toBe(false);
  });

  it("rejects a non-URL source", () => {
    const pack = completePack({
      targetTools: [
        target("nextcloud", "file_sharing", { sources: ["see the website"] }),
      ],
    });
    expect(rulepackSchema.safeParse(pack).success).toBe(false);
  });

  it("rejects a malformed review date", () => {
    const pack = completePack({
      targetTools: [
        target("nextcloud", "file_sharing", { lastReviewed: "August 2026" }),
      ],
    });
    expect(rulepackSchema.safeParse(pack).success).toBe(false);
  });

  it("requires German text on localized fields", () => {
    const pack = completePack({
      targetTools: [
        target("nextcloud", "file_sharing", { summary: { en: "only English" } }),
      ],
    });
    expect(rulepackSchema.safeParse(pack).success).toBe(false);
  });

  it("allows English to be absent while it is being written", () => {
    const pack = completePack({
      targetTools: [
        target("nextcloud", "file_sharing", { summary: { de: "Nur Deutsch" } }),
      ],
    });
    expect(rulepackSchema.safeParse(pack).success).toBe(true);
  });

  it("rejects a version that is not date-based", () => {
    expect(rulepackSchema.safeParse(completePack({ version: "1.0.0" })).success).toBe(
      false,
    );
  });
});

describe("rulepack integrity", () => {
  it("reports no problems for a complete pack", () => {
    expect(findIntegrityProblems(rulepackSchema.parse(completePack()))).toEqual([]);
  });

  it("flags a category that the domain declares but the pack omits", () => {
    const base = basePack();
    const pack = completePack({
      categories: base.categories.filter((c) => c.id !== "crm"),
      targetTools: base.targetTools.filter((t) => t.category !== "crm"),
    });

    const problems = findIntegrityProblems(rulepackSchema.parse(pack));
    expect(problems.map((p) => p.message).join(" ")).toMatch(/"crm".*not declared/);
  });

  it("flags a category with no target tools, which would render an empty section", () => {
    const base = basePack();
    const pack = completePack({
      targetTools: base.targetTools.filter((t) => t.category !== "helpdesk"),
    });

    const problems = findIntegrityProblems(rulepackSchema.parse(pack));
    expect(problems.map((p) => p.message).join(" ")).toMatch(/no target tools/);
  });

  it("flags a migration edge pointing at an unknown target", () => {
    const pack = completePack({
      migrationEdges: [
        {
          from: "*",
          to: "does-not-exist",
          complexityDelta: 0,
          dataMigration: { effort: 3, toolingExists: true, notes: { de: "n" } },
          gotchas: [],
          ...PROVENANCE,
        },
      ],
    });

    const problems = findIntegrityProblems(rulepackSchema.parse(pack));
    expect(problems.map((p) => p.message).join(" ")).toMatch(/Unknown target tool/);
  });

  it("flags an edge that crosses categories", () => {
    const pack = completePack({
      sourceTools: [
        {
          id: "sharepoint",
          category: "file_sharing",
          name: "SharePoint",
          vendorLockIn: 4,
          dataExportQuality: 3,
          commonIn: ["sme"],
          ...PROVENANCE,
        },
      ],
      migrationEdges: [
        {
          from: "sharepoint",
          to: "helpdesk-target",
          complexityDelta: 0,
          dataMigration: { effort: 3, toolingExists: false, notes: { de: "n" } },
          gotchas: [],
          ...PROVENANCE,
        },
      ],
    });

    const problems = findIntegrityProblems(rulepackSchema.parse(pack));
    expect(problems.map((p) => p.message).join(" ")).toMatch(/different categories/);
  });

  it("flags an unknown prerequisite reference", () => {
    const pack = completePack({
      targetTools: [
        target("nextcloud", "file_sharing", { prerequisites: ["no-such-thing"] }),
      ],
    });

    const problems = findIntegrityProblems(rulepackSchema.parse(pack));
    expect(problems.map((p) => p.message).join(" ")).toMatch(/Unknown prerequisite/);
  });

  it("flags duplicate identifiers", () => {
    const base = basePack();
    const pack = completePack({
      targetTools: [...base.targetTools, base.targetTools[0]!],
    });

    const problems = findIntegrityProblems(rulepackSchema.parse(pack));
    expect(problems.map((p) => p.message).join(" ")).toMatch(/Duplicate id/);
  });

  it("flags top sovereignty on a tool that cannot be self-hosted", () => {
    const pack = completePack({
      targetTools: [
        target("some-saas", "file_sharing", {
          sovereignty: 5,
          hostingModes: ["eu_saas"],
        }),
      ],
    });

    const problems = findIntegrityProblems(rulepackSchema.parse(pack));
    expect(problems.map((p) => p.message).join(" ")).toMatch(/cannot be self-hosted/);
  });

  it("flags top public-sector fit with community-only support", () => {
    const pack = completePack({
      targetTools: [
        target("community-tool", "file_sharing", {
          supportModel: "community",
          publicSectorFit: 5,
        }),
      ],
    });

    const problems = findIntegrityProblems(rulepackSchema.parse(pack));
    expect(problems.map((p) => p.message).join(" ")).toMatch(/community-only support/);
  });

  it("collects every problem rather than stopping at the first", () => {
    const pack = completePack({ targetTools: [] });
    const problems = findIntegrityProblems(rulepackSchema.parse(pack));

    // One per category left without targets.
    expect(problems.length).toBe(CATEGORY_IDS.length);
  });

  it("throws with all problems listed", () => {
    expect(() => validateRulepack(completePack({ targetTools: [] }))).toThrow(
      /failed integrity checks/,
    );
  });
});
