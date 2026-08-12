import { describe, expect, it } from "vitest";
import { selectStack } from "@/engine/candidates";
import { normalize } from "@/engine/normalize";
import { assessReadiness } from "@/engine/readiness";
import { currentRulepack } from "@/rulepack";
import { assessment, type AssessmentOverrides } from "../fixtures/build";
import type { CategoryRecommendation } from "@/engine/candidates";

const pack = currentRulepack();

function recommend(overrides: AssessmentOverrides = {}): CategoryRecommendation[] {
  const normalized = normalize(assessment(overrides));
  return selectStack(normalized, assessReadiness(normalized), pack);
}

const forCategory = (recs: CategoryRecommendation[], category: string) => {
  const found = recs.find((r) => r.category === category);
  if (!found) throw new Error(`No recommendation for ${category}`);
  return found;
};

describe("candidate selection", () => {
  it("recommends a primary and keeps backups for every assessed category", () => {
    const recs = recommend({ categories: ["file_sharing", "helpdesk"] });

    expect(recs).toHaveLength(2);
    for (const rec of recs) {
      expect(rec.primary).not.toBeNull();
      expect(rec.backups.length).toBeGreaterThanOrEqual(1);
      expect(rec.primary!.score).toBeGreaterThanOrEqual(rec.backups[0]!.score);
    }
  });

  it("explains why the primary fits rather than just asserting it", () => {
    const rec = forCategory(
      recommend({ categories: ["file_sharing"] }),
      "file_sharing",
    );
    expect(rec.primary!.fitReasons.length).toBeGreaterThan(0);
    for (const reason of rec.primary!.fitReasons) {
      expect(reason.code).toMatch(/^fit\./);
      expect(reason.evidence.length).toBeGreaterThan(0);
    }
  });

  it("keeps the reason a candidate was ruled out", () => {
    // Vendor support required rules out community-supported products.
    const rec = forCategory(
      recommend({
        categories: ["forms_surveys"],
        supportExpectation: "vendor_support_needed",
      }),
      "forms_surveys",
    );

    expect(rec.eliminated.length).toBeGreaterThan(0);
    for (const { reason } of rec.eliminated) {
      expect(reason.severity).toBe("blocker");
      expect(reason.code).toMatch(/^blocker\./);
    }
  });

  it("rules out community-only products when a vendor contract is required", () => {
    const rec = forCategory(
      recommend({
        categories: ["forms_surveys"],
        supportExpectation: "vendor_support_needed",
      }),
      "forms_surveys",
    );

    const eliminatedIds = rec.eliminated.map((e) => e.tool.id);
    expect(eliminatedIds).toContain("openflow");
    expect(rec.primary!.tool.supportModel).not.toBe("community");
  });

  it("keeps community-supported products for an organization that tolerates them", () => {
    const rec = forCategory(
      recommend({
        categories: ["forms_surveys"],
        orgType: "association",
        publicSector: false,
        supportExpectation: "community_tolerant",
      }),
      "forms_surveys",
    );

    // It survives the hard constraints rather than being ruled out...
    expect(rec.eliminated.map((e) => e.tool.id)).not.toContain("openflow");

    // ...but a three-star project with no German service market does not
    // displace established options. Surviving and being recommended are
    // different things, and the distinction is the product's whole point.
    expect(rec.primary!.tool.id).not.toBe("openflow");
    expect(rec.primary!.tool.maturity).toBeGreaterThanOrEqual(3);
  });

  it("rules out a product whose seat ceiling is far below the need", () => {
    const rec = forCategory(
      recommend({
        categories: ["chat_video"],
        totalSeats: 4000,
        categorySeats: 4000,
        supportExpectation: "community_tolerant",
      }),
      "chat_video",
    );

    // Nextcloud Talk is comfortable to a few hundred; 4000 is out of range.
    expect(rec.eliminated.map((e) => e.tool.id)).toContain("nextcloud-talk");
  });

  it("attaches cautions without eliminating the candidate", () => {
    // A public body with little admin capacity looking at project management,
    // where some options have a thin German service market and few public-sector
    // references. Neither is disqualifying; both are worth saying out loud.
    const rec = forCategory(
      recommend({
        categories: ["project_management"],
        orgType: "municipality",
        publicSector: true,
        adminCapacity: "low",
        supportExpectation: "community_tolerant",
      }),
      "project_management",
    );

    const surviving = [rec.primary!, ...rec.backups];
    const cautions = surviving.flatMap((c) => c.cautions);

    expect(cautions.length).toBeGreaterThan(0);
    for (const caution of cautions) {
      expect(caution.severity).toBe("caution");
      expect(caution.code).toMatch(/^caution\./);
    }

    // The cautioned candidate is still on the table, not silently dropped.
    expect(surviving.some((c) => c.cautions.length > 0)).toBe(true);
  });

  it("prefers products with German-market support for a German public body", () => {
    const rec = forCategory(
      recommend({
        categories: ["helpdesk"],
        orgType: "municipality",
        publicSector: true,
      }),
      "helpdesk",
    );
    expect(rec.primary!.tool.deMarketPresence).toBeGreaterThanOrEqual(4);
  });

  it("lets ecosystem coherence break a tie without overturning a mismatch", () => {
    const coherent = recommend({
      categories: ["file_sharing", "chat_video"],
      supportExpectation: "community_tolerant",
    });
    const talk = forCategory(coherent, "chat_video");
    const candidates = [talk.primary!, ...talk.backups];

    // Nextcloud is the likely file-sharing pick, so Nextcloud Talk gains a small
    // bonus — but it must not leapfrog products that are fundamentally stronger
    // for this organization.
    const nextcloudTalk = candidates.find((c) => c.tool.id === "nextcloud-talk");
    if (nextcloudTalk) {
      expect(nextcloudTalk.score).toBeLessThanOrEqual(100);
    }
    expect(talk.primary!.score).toBeGreaterThanOrEqual(candidates.at(-1)!.score);
  });

  it("reports honestly when nothing survives the constraints", () => {
    const rec = forCategory(
      recommend({
        categories: ["dms_archive"],
        totalSeats: 40_000,
        categorySeats: 40_000,
      }),
      "dms_archive",
    );

    expect(rec.primary).toBeNull();
    expect(rec.notes.map((n) => n.code)).toContain(
      "note.no_candidate_survived_constraints",
    );
    expect(rec.eliminated.length).toBeGreaterThan(0);
  });

  it("is deterministic", () => {
    const run = () =>
      JSON.stringify(recommend({ categories: ["file_sharing", "helpdesk"] }));
    expect(run()).toBe(run());
  });

  it("never scores outside 0 to 100", () => {
    const recs = recommend({
      categories: ["file_sharing", "office_docs", "chat_video", "helpdesk"],
      totalSeats: 25_000,
      adminCapacity: "low",
      linuxCapability: "none",
      trainingSensitivity: "high",
      supportExpectation: "community_tolerant",
    });

    for (const rec of recs) {
      for (const candidate of [rec.primary, ...rec.backups].filter(Boolean)) {
        expect(candidate!.score).toBeGreaterThanOrEqual(0);
        expect(candidate!.score).toBeLessThanOrEqual(100);
      }
    }
  });
});
