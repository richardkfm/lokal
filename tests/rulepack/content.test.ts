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

  // ADR-0003 lets the rulepack carry prices. What it does not let anyone do is
  // hand-format one: money is `{ amountCents, currency }` here and becomes text
  // only in a renderer, where the locale is known. A euro glyph in rule data
  // means an amount was written out by hand, and a hand-written amount has lost
  // the plan name, source and date that make it checkable.
  it("carries money as data, never as formatted text", () => {
    expect(JSON.stringify(pack)).not.toMatch(/€/);
  });

  // The guardrails from ADR-0003, as assertions. A price without a vendor source
  // is the exact failure the ADR was written to prevent: researching this pack
  // found four different figures for comparable plans depending on which
  // reseller was asked.
  it("cites the vendor's own page for every list price", () => {
    const priced = pack.sourceTools.filter((tool) => tool.listPrice);
    expect(priced.length).toBeGreaterThan(0);

    for (const tool of priced) {
      const price = tool.listPrice!;
      expect({ id: tool.id, plan: price.planName }).toEqual({
        id: tool.id,
        plan: expect.any(String),
      });
      expect(price.planName.length).toBeGreaterThan(0);
      expect(price.source).toMatch(/^https:\/\//);
      expect(price.observedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(price.currency).toBe("EUR");
      expect(Number.isInteger(price.amountCents)).toBe(true);
      expect(price.amountCents).toBeGreaterThan(0);
    }
  });

  // Every Microsoft service an organization is likely to list separately comes
  // out of one subscription. If they did not share a bundle id, a Kommune running
  // Microsoft 365 for office, files, chat, intranet and forms would have a single
  // invoice counted five times — the one arithmetic error large enough to
  // discredit the whole report.
  it("groups products sold as one subscription under one bundle", () => {
    const microsoft = pack.sourceTools.filter((tool) =>
      tool.listPrice?.source.includes("microsoft.com"),
    );
    expect(microsoft.length).toBeGreaterThan(1);

    for (const tool of microsoft) {
      expect({ id: tool.id, bundle: tool.listPrice?.bundleId }).toEqual({
        id: tool.id,
        bundle: "microsoft-365",
      });
    }
  });

  // Where no vendor page states a euro figure, the honest outcome is no entry at
  // all. Google and Slack publish USD on their German pages; borrowing a
  // reseller's euro number would be exactly the fabricated precision the old
  // no-currency rule existed to stop.
  it("records no price where no vendor euro figure could be cited", () => {
    for (const id of ["google-workspace-docs", "google-drive", "slack", "dropbox"]) {
      const tool = pack.sourceTools.find((t) => t.id === id);
      expect({ id, priced: Boolean(tool?.listPrice) }).toEqual({ id, priced: false });
    }
  });
});

describe("blocker rules", () => {
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

describe("capability regressions", () => {
  it("warns when replacing a cloud office suite loses real-time co-editing", () => {
    const libreoffice = pack.targetTools.find((t) => t.id === "libreoffice")!;
    const rule = pack.blockerRules.find(
      (r) => r.id === "loses-realtime-collaboration",
    )!;

    const entry = {
      ...baseInput.stack[0]!,
      category: "office_docs" as const,
      currentTool: { kind: "known" as const, id: "microsoft-365-apps" },
    };

    // Lower operating cost is a legitimate trade, but losing a capability people
    // use daily has to be said out loud rather than discovered after rollout.
    expect(rule.when({ input: baseInput, entry, target: libreoffice })).toBe(true);

    const collabora = pack.targetTools.find((t) => t.id === "collabora-online")!;
    expect(rule.when({ input: baseInput, entry, target: collabora })).toBe(false);
  });
});

/**
 * A released pack is immutable.
 *
 * v2026-09 is an overlay on v2026-08 rather than an edit of it, because a
 * silently changed pack makes a report regenerated next month disagree with the
 * printed copy in someone's folder — with nothing in either document explaining
 * why. These tests are what stop a future contributor from "just adding" an
 * entry to the older pack.
 */
describe("released packs stay immutable", () => {
  const previous = getRulepack("v2026-08");

  it("keeps the previous pack available for assessments taken against it", () => {
    expect(availableRulepackVersions()).toEqual(["v2026-08", "v2026-09"]);
    expect(CURRENT_RULEPACK_VERSION).toBe("v2026-09");
  });

  it("leaves the previous pack free of this release's additions", () => {
    expect(previous.targetTools.map((t) => t.id)).not.toContain("euro-office");
    expect(previous.sourceTools.filter((t) => t.listPrice)).toEqual([]);
    expect(previous.blockerRules.map((r) => r.id)).not.toContain(
      "young-suite-needs-pilot",
    );
  });

  it("changes nothing else about the previous pack's content", () => {
    expect(previous.categories).toEqual(pack.categories);
    expect(previous.prerequisites).toEqual(pack.prerequisites);
    expect(previous.aiUseCases).toEqual(pack.aiUseCases);
    // Same source tools, differing only by the prices overlaid onto them.
    expect(previous.sourceTools.map((t) => t.id)).toEqual(
      pack.sourceTools.map((t) => t.id),
    );
  });
});

describe("Euro-Office", () => {
  const entry = pack.targetTools.find((t) => t.id === "euro-office");

  it("is a sourced office option in the current pack", () => {
    expect(entry?.category).toBe("office_docs");
    expect(entry?.license).toBe("agpl");
    expect(entry?.sources.length).toBeGreaterThan(0);
  });

  // The most on-thesis entry in the pack is the one most at risk of being
  // over-rated. It shipped 1.0 in June 2026; a low maturity score is what keeps
  // the sequencing engine from scheduling it first for a risk-averse body.
  it("is rated as the young release it is", () => {
    expect(entry?.maturity).toBeLessThanOrEqual(2);
  });

  it("has a migration edge from each incumbent office suite", () => {
    for (const from of [
      "microsoft-365-apps",
      "google-workspace-docs",
      "ms-office-onprem",
    ]) {
      expect({
        from,
        found: pack.migrationEdges.some(
          (e) => e.from === from && e.to === "euro-office",
        ),
      }).toEqual({ from, found: true });
    }
  });

  // A caution, never a blocker. For an organization that has decided sovereignty
  // is the priority, being early is the point — lokal's job is to make the trade
  // visible, not to make it for them.
  it("draws a pilot caution instead of being ruled out", () => {
    const target = pack.targetTools.find((t) => t.id === "euro-office")!;
    const stackEntry = baseInput.stack[0]!;
    const fired = pack.blockerRules.filter((rule) =>
      rule.when({ input: baseInput, entry: stackEntry, target }),
    );

    expect(fired.filter((r) => r.severity === "blocker").map((r) => r.id)).toEqual([]);
    expect(fired.map((r) => r.id)).toContain("young-suite-needs-pilot");
  });
});
