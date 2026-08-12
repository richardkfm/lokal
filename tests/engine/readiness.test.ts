import { describe, expect, it } from "vitest";
import { normalize, seatWeight } from "@/engine/normalize";
import { assessReadiness } from "@/engine/readiness";
import { assessment } from "../fixtures/build";

const codes = (items: { code: string }[]) => items.map((i) => i.code);

describe("normalize", () => {
  it("derives the size bucket from the seat count", () => {
    expect(normalize(assessment({ totalSeats: 180 })).derived.sizeBucket).toBe(
      "51-250",
    );
  });

  it("scales seat pressure sub-linearly", () => {
    // Going from 10 to 100 seats changes a migration fundamentally;
    // 1000 to 1090 does not. The curve has to reflect that.
    const small = seatWeight(100) - seatWeight(10);
    const large = seatWeight(1090) - seatWeight(1000);
    expect(small).toBeGreaterThan(large * 5);
  });

  it("treats a municipality as public sector even if the box is unticked", () => {
    const result = normalize(
      assessment({ orgType: "municipality", publicSector: false }),
    );
    expect(result.derived.publicSectorProfile).toBe(true);
    expect(codes(result.notes)).toContain("note.public_sector_implied_by_org_type");
  });

  it("reports unassessed categories rather than assuming they are fine", () => {
    const result = normalize(assessment({ categories: ["file_sharing"] }));
    expect(result.derived.unassessedCategories).toHaveLength(8);
    expect(codes(result.notes)).toContain("note.categories_not_assessed");
  });

  it("flags a category claiming more seats than the organization has", () => {
    const result = normalize(
      assessment({ totalSeats: 50, categories: ["file_sharing"], categorySeats: 400 }),
    );
    expect(codes(result.notes)).toContain("note.category_seats_exceed_organization");
  });

  it("accepts a category serving a fraction of the organization without complaint", () => {
    const result = normalize(
      assessment({ totalSeats: 180, categories: ["helpdesk"], categorySeats: 12 }),
    );
    expect(codes(result.notes)).not.toContain(
      "note.category_seats_exceed_organization",
    );
  });
});

describe("readiness profile", () => {
  it("rates a capable organization highly on operations", () => {
    const profile = assessReadiness(
      normalize(
        assessment({
          linuxCapability: "strong",
          adminCapacity: "high",
          itMaturity: "high",
          supportExpectation: "community_tolerant",
        }),
      ),
    );
    expect(profile.opsCapability.label).toBe("strong");
  });

  it("rates an organization with no IT capability as weak", () => {
    const profile = assessReadiness(
      normalize(
        assessment({
          linuxCapability: "none",
          adminCapacity: "low",
          itMaturity: "low",
          supportExpectation: "vendor_support_needed",
        }),
      ),
    );
    expect(profile.opsCapability.label).toBe("weak");
    expect(profile.supportNeed.score).toBeGreaterThan(70);
  });

  it("flags wanting to self-host without anyone able to run Linux", () => {
    const profile = assessReadiness(
      normalize(
        assessment({ hostingPreference: "self_hosted", linuxCapability: "none" }),
      ),
    );
    expect(codes(profile.gaps)).toContain("gap.self_hosting_without_linux_capability");
  });

  it("does not flag self-hosting where the capability exists", () => {
    const profile = assessReadiness(
      normalize(
        assessment({ hostingPreference: "self_hosted", linuxCapability: "strong" }),
      ),
    );
    expect(codes(profile.gaps)).not.toContain(
      "gap.self_hosting_without_linux_capability",
    );
  });

  it("flags a missing identity foundation once an organization is large enough", () => {
    const large = assessReadiness(
      normalize(assessment({ totalSeats: 180, identityMaturity: "low" })),
    );
    const small = assessReadiness(
      normalize(assessment({ totalSeats: 12, identityMaturity: "low" })),
    );

    // Twelve people can live with ad-hoc accounts. A hundred and eighty cannot.
    expect(codes(large.gaps)).toContain("gap.identity_foundation_missing_at_scale");
    expect(codes(small.gaps)).not.toContain("gap.identity_foundation_missing_at_scale");
  });

  it("flags AI ambition with no hardware to run it on", () => {
    const profile = assessReadiness(
      normalize(assessment({ aiInterest: "active", hardwareProfile: "none" })),
    );
    expect(codes(profile.gaps)).toContain("gap.ai_ambition_without_hardware");
    expect(profile.aiReadiness.label).toBe("weak");
  });

  it("flags sensitive data headed for external inference", () => {
    const profile = assessReadiness(
      normalize(assessment({ dataSensitivity: "high", aiDeployment: "eu_hosted" })),
    );
    expect(codes(profile.gaps)).toContain("gap.sensitive_data_with_external_inference");
  });

  it("flags several urgent critical migrations landing at once", () => {
    const profile = assessReadiness(
      normalize(
        assessment({
          categories: ["file_sharing", "chat_video", "helpdesk"],
          urgency: "now",
          criticality: "high",
          itMaturity: "low",
          adminCapacity: "low",
        }),
      ),
    );
    expect(codes(profile.gaps)).toContain(
      "gap.several_urgent_critical_migrations_at_once",
    );
  });

  it("gives every band a score, a label and its drivers", () => {
    const profile = assessReadiness(normalize(assessment({})));
    for (const key of [
      "opsCapability",
      "changeCapacity",
      "identityReadiness",
      "supportNeed",
      "aiReadiness",
    ] as const) {
      expect(profile[key].score).toBeGreaterThanOrEqual(0);
      expect(profile[key].score).toBeLessThanOrEqual(100);
      expect(profile[key].drivers.length).toBeGreaterThan(0);
    }
  });

  it("keeps every band within range even at the extremes", () => {
    const weakest = assessReadiness(
      normalize(
        assessment({
          totalSeats: 25_000,
          linuxCapability: "none",
          adminCapacity: "low",
          itMaturity: "low",
          identityMaturity: "low",
          departments: Array.from({ length: 30 }, (_, i) => `Amt ${i}`),
        }),
      ),
    );
    for (const key of ["opsCapability", "changeCapacity", "overall"] as const) {
      expect(weakest[key].score).toBeGreaterThanOrEqual(0);
      expect(weakest[key].score).toBeLessThanOrEqual(100);
    }
  });

  it("is deterministic", () => {
    const run = () => JSON.stringify(assessReadiness(normalize(assessment({}))));
    expect(run()).toBe(run());
  });
});
