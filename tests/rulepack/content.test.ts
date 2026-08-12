import { describe, expect, it } from "vitest";
import {
  CURRENT_RULEPACK_VERSION,
  availableRulepackVersions,
  currentRulepack,
  getRulepack,
  hasRulepack,
} from "@/rulepack";
import { findIntegrityProblems, reviewCoverage } from "@/rulepack/integrity";
import { CATEGORY_IDS } from "@/domain/enums";

const pack = currentRulepack();

describe("shipped rulepack", () => {
  it("passes schema and integrity checks", () => {
    expect(findIntegrityProblems(pack)).toEqual([]);
  });

  it("is registered under its own version", () => {
    expect(hasRulepack(CURRENT_RULEPACK_VERSION)).toBe(true);
    expect(availableRulepackVersions()).toContain(CURRENT_RULEPACK_VERSION);
    expect(getRulepack(CURRENT_RULEPACK_VERSION)).toBe(pack);
  });

  it("fails loudly for an unknown version", () => {
    expect(() => getRulepack("v1999-01")).toThrow(/Unknown rulepack version/);
  });

  it("covers every category with at least two target options", () => {
    for (const category of CATEGORY_IDS) {
      const targets = pack.targetTools.filter((t) => t.category === category);
      expect({ category, count: targets.length }).toEqual({
        category,
        count: expect.any(Number),
      });
      expect(targets.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("offers a current tool to choose for every category", () => {
    for (const category of CATEGORY_IDS) {
      expect(
        pack.sourceTools.filter((s) => s.category === category).length,
      ).toBeGreaterThanOrEqual(2);
    }
  });

  it("marks CRM and DMS as narrower coverage rather than implying equal depth", () => {
    const focused = pack.categories
      .filter((c) => c.coverageDepth === "focused")
      .map((c) => c.id)
      .sort();
    expect(focused).toEqual(["crm", "dms_archive"]);
  });

  it("declares every entry as draft until a human has verified it", () => {
    const coverage = reviewCoverage(pack);
    expect(coverage.total).toBeGreaterThan(0);
    // v0.1.0 ships unverified on purpose, and the report says so. This assertion
    // exists so that promoting entries to "verified" is a deliberate act.
    expect(coverage.verified).toBe(0);
  });

  it("cites a real source for every entry", () => {
    const entries = [
      ...pack.sourceTools,
      ...pack.targetTools,
      ...pack.migrationEdges,
      ...pack.aiUseCases,
      ...pack.aiDeployments,
    ];

    for (const entry of entries) {
      expect(entry.sources.length).toBeGreaterThan(0);
      for (const source of entry.sources) {
        expect(source).toMatch(/^https:\/\//);
      }
    }
  });

  it("keeps every prerequisite reachable from at least one target", () => {
    const referenced = new Set(pack.targetTools.flatMap((t) => t.prerequisites));
    const orphaned = pack.prerequisites
      .map((p) => p.id)
      .filter((id) => !referenced.has(id));

    // An unreferenced prerequisite would never appear in phase 0, so it is dead
    // rule data rather than a plan step.
    expect(orphaned).toEqual([]);
  });

  it("gives every AI use case a governance note and a review expectation", () => {
    for (const useCase of pack.aiUseCases) {
      expect(useCase.governanceNotes.de.length).toBeGreaterThan(20);
      expect(["optional", "recommended", "required"]).toContain(
        useCase.humanReviewExpectation,
      );
    }
  });

  it("requires human review for every use case that touches internal records", () => {
    for (const useCase of pack.aiUseCases.filter((u) => u.requiresContentSource)) {
      expect(useCase.humanReviewExpectation).toBe("required");
    }
  });

  it("states no euro amounts anywhere in rule text", () => {
    expect(JSON.stringify(pack)).not.toMatch(/€|\bEUR\b/);
  });
});

describe("blocker rules", () => {
  const baseInput = {
    schemaVersion: 1 as const,
    locale: "de" as const,
    org: {
      orgType: "municipality" as const,
      country: "DE" as const,
      totalSeats: 180,
      departments: [],
      publicSector: true,
      germanLanguageRequired: true,
    },
    operating: {
      hostingPreference: "self_hosted" as const,
      itMaturity: "medium" as const,
      adminCapacity: "medium" as const,
      identityMaturity: "low" as const,
      linuxCapability: "basic" as const,
      supportExpectation: "vendor_support_needed" as const,
    },
    stack: [
      {
        category: "forms_surveys" as const,
        currentTool: { kind: "known" as const, id: "microsoft-forms" },
        seats: 180,
        criticality: "medium" as const,
        pain: "medium" as const,
        urgency: "this_year" as const,
        lockInConcern: "medium" as const,
        trainingSensitivity: "medium" as const,
      },
    ],
    ai: {
      interest: "cautious" as const,
      dataSensitivity: "medium" as const,
      deploymentPreference: "undecided" as const,
      hardwareProfile: "office_pcs" as const,
      useCases: [],
    },
  };

  function firedRules(targetId: string) {
    const target = pack.targetTools.find((t) => t.id === targetId);
    if (!target) throw new Error(`No such target: ${targetId}`);
    const entry = baseInput.stack[0]!;

    return pack.blockerRules
      .filter((rule) => rule.when({ input: baseInput, entry, target }))
      .map((rule) => rule.id);
  }

  it("rules out a community-supported tool when vendor support is required", () => {
    expect(firedRules("openflow")).toContain("community-support-when-vendor-required");
  });

  it("cautions a public body about a licence carrying use restrictions", () => {
    expect(firedRules("openflow")).toContain("restricted-license-in-public-sector");
  });

  it("does not fire the licence caution for a plainly licensed tool", () => {
    expect(firedRules("limesurvey")).not.toContain(
      "restricted-license-in-public-sector",
    );
  });

  it("leaves a well-matched recommendation unblocked", () => {
    expect(firedRules("limesurvey")).toEqual([]);
  });
});
