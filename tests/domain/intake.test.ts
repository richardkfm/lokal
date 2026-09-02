import { describe, expect, it } from "vitest";
import {
  INTAKE_SCHEMA_VERSION,
  assessmentInputSchema,
  parseAssessmentInput,
  upgradeAssessmentInput,
} from "@/domain/intake";
import { SIZE_BUCKETS, levelToUnit, sizeBucketForSeats } from "@/domain/enums";
import type { AssessmentInput } from "@/domain/intake";

/**
 * A minimal but valid assessment: a small association with one category.
 * Returned fresh each time so tests can mutate their own copy.
 */
function validInput() {
  return {
    schemaVersion: INTAKE_SCHEMA_VERSION,
    locale: "de",
    org: {
      orgType: "association",
      country: "DE",
      totalSeats: 14,
      departments: ["Geschäftsstelle"],
      publicSector: false,
      germanLanguageRequired: true,
    },
    operating: {
      hostingPreference: "undecided",
      itMaturity: "low",
      adminCapacity: "low",
      identityMaturity: "low",
      linuxCapability: "none",
      supportExpectation: "vendor_support_needed",
    },
    workplace: {
      clientOs: "mixed",
      windowsOnlyApps: "few",
      deviceManagement: "none",
      peripheralDependency: "low",
    },
    rates: {},
    stack: [
      {
        category: "file_sharing",
        currentTool: { kind: "known", id: "dropbox" },
        seats: 14,
        criticality: "medium",
        pain: "high",
        urgency: "this_year",
        lockInConcern: "medium",
        trainingSensitivity: "high",
      },
    ],
    ai: {
      interest: "cautious",
      dataSensitivity: "medium",
      deploymentPreference: "undecided",
      hardwareProfile: "office_pcs",
      useCases: ["summarization"],
    },
  };
}

describe("assessment intake", () => {
  it("accepts a valid assessment", () => {
    const parsed = parseAssessmentInput(validInput());
    expect(parsed.org.orgType).toBe("association");
    expect(parsed.stack).toHaveLength(1);
  });

  it("defaults optional collections rather than leaving them undefined", () => {
    const input = validInput();
    const { departments: _omitted, ...orgWithoutDepartments } = input.org;

    const parsed = assessmentInputSchema.parse({
      ...input,
      org: orgWithoutDepartments,
      ai: { ...input.ai, useCases: undefined },
    });

    expect(parsed.org.departments).toEqual([]);
    expect(parsed.ai.useCases).toEqual([]);
  });

  it("rejects a stack that assesses the same category twice", () => {
    const input = validInput();
    const result = assessmentInputSchema.safeParse({
      ...input,
      stack: [input.stack[0], input.stack[0]],
    });

    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toMatch(/only be assessed once/);
  });

  it("rejects an empty stack, because silence is not an assessment", () => {
    const result = assessmentInputSchema.safeParse({ ...validInput(), stack: [] });
    expect(result.success).toBe(false);
  });

  it.each([
    ["zero seats", 0],
    ["fractional seats", 12.5],
    ["negative seats", -3],
  ])("rejects %s", (_label, totalSeats) => {
    const input = validInput();
    const result = assessmentInputSchema.safeParse({
      ...input,
      org: { ...input.org, totalSeats },
    });
    expect(result.success).toBe(false);
  });

  it("distinguishes an unknown tool from no tool at all", () => {
    const input = validInput();

    const other = assessmentInputSchema.parse({
      ...input,
      stack: [
        {
          ...input.stack[0],
          currentTool: { kind: "other", label: "Eigenentwicklung" },
        },
      ],
    });
    const none = assessmentInputSchema.parse({
      ...input,
      stack: [{ ...input.stack[0], currentTool: { kind: "none" } }],
    });

    expect(other.stack[0]?.currentTool).toEqual({
      kind: "other",
      label: "Eigenentwicklung",
    });
    expect(none.stack[0]?.currentTool).toEqual({ kind: "none" });
  });

  it("rejects an unnamed 'other' tool", () => {
    const input = validInput();
    const result = assessmentInputSchema.safeParse({
      ...input,
      stack: [{ ...input.stack[0], currentTool: { kind: "other", label: "  " } }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown schema version so stored payloads fail loudly", () => {
    const result = assessmentInputSchema.safeParse({
      ...validInput(),
      schemaVersion: 99,
    });
    expect(result.success).toBe(false);
  });

  it("trims whitespace from free text", () => {
    const input = validInput();
    const parsed = assessmentInputSchema.parse({
      ...input,
      org: { ...input.org, departments: ["  Bauamt  "] },
    });
    expect(parsed.org.departments).toEqual(["Bauamt"]);
  });

  it("allows per-category seats to differ from the organization total", () => {
    const input = validInput();
    const parsed = assessmentInputSchema.parse({
      ...input,
      org: { ...input.org, totalSeats: 180 },
      stack: [{ ...input.stack[0], seats: 12 }],
    });

    // Divergence is legitimate — a helpdesk tool may serve twelve of 180 people.
    // The engine flags implausible spreads; the schema does not forbid them.
    expect(parsed.org.totalSeats).toBe(180);
    expect(parsed.stack[0]?.seats).toBe(12);
  });

  describe("payloads stored before the workplace block existed", () => {
    /**
     * A version 1 payload, exactly as it sits in the database today: no
     * `workplace`, no `rates`. Built from the current fixture by removal so it
     * cannot drift away from the real shape.
     */
    function v1Input() {
      const {
        workplace: _workplace,
        rates: _rates,
        ...rest
      } = validInput() as Record<string, unknown> & {
        workplace: unknown;
        rates: unknown;
      };
      return { ...rest, schemaVersion: 1 };
    }

    it("upgrades rather than rejecting, so a shared report link keeps resolving", () => {
      const upgraded = upgradeAssessmentInput(v1Input());

      expect(upgraded.schemaVersion).toBe(INTAKE_SCHEMA_VERSION);
      expect(upgraded.org.orgType).toBe("association");
      expect(upgraded.stack).toHaveLength(1);
    });

    it("records the missing answers as unknown rather than assuming Windows", () => {
      const upgraded = upgradeAssessmentInput(v1Input());

      // The whole point of the upgrade. An estate nobody described must reach
      // the report as "nicht erhoben", never as an asserted Windows estate.
      expect(upgraded.workplace.clientOs).toBe("unknown");
      expect(upgraded.workplace.windowsOnlyApps).toBe("unknown");
      expect(upgraded.workplace.deviceManagement).toBe("unknown");
      expect(upgraded.workplace.deviceCount).toBeUndefined();
    });

    it("leaves the rates absent rather than zero, so no cost figure is stated", () => {
      const upgraded = upgradeAssessmentInput(v1Input());

      // ADR-0004 guardrail 1: a zero here would render as a cost of nothing.
      expect(upgraded.rates.internalDayRateCents).toBeUndefined();
      expect(upgraded.rates.externalDayRateCents).toBeUndefined();
    });

    it("passes a current payload through untouched", () => {
      const current = validInput();
      expect(upgradeAssessmentInput(current)).toEqual(parseAssessmentInput(current));
    });

    it("still rejects a version it has never known", () => {
      expect(() =>
        upgradeAssessmentInput({ ...v1Input(), schemaVersion: 99 }),
      ).toThrow();
    });
  });

  describe("declared day rates", () => {
    function withRates(rates: Record<string, unknown>) {
      return assessmentInputSchema.safeParse({ ...validInput(), rates });
    }

    it("accepts an absent rate, which is the ordinary case", () => {
      expect(withRates({}).success).toBe(true);
    });

    it("rejects a rate of zero rather than storing a cost of nothing", () => {
      // An explicit zero is never what someone means, and it would render as a
      // migration that costs nothing (ADR-0004).
      expect(withRates({ internalDayRateCents: 0 }).success).toBe(false);
    });

    it("rejects a fractional cent", () => {
      expect(withRates({ externalDayRateCents: 480.5 }).success).toBe(false);
    });

    it("accepts a plausible declared rate", () => {
      const parsed = assessmentInputSchema.parse({
        ...validInput(),
        rates: { internalDayRateCents: 48_000, externalDayRateCents: 95_000 },
      });
      expect(parsed.rates.internalDayRateCents).toBe(48_000);
    });
  });

  it("keeps the inferred type assignable", () => {
    const parsed: AssessmentInput = parseAssessmentInput(validInput());
    expect(parsed.schemaVersion).toBe(INTAKE_SCHEMA_VERSION);
  });
});

describe("size buckets", () => {
  it.each([
    [1, "1-20"],
    [20, "1-20"],
    [21, "21-50"],
    [50, "21-50"],
    [51, "51-250"],
    [250, "51-250"],
    [251, "251-1000"],
    [1000, "251-1000"],
    [1001, "1000+"],
    [25_000, "1000+"],
  ])("maps %i seats to %s", (seats, expected) => {
    expect(sizeBucketForSeats(seats)).toBe(expected);
  });

  it("covers every bucket without gaps", () => {
    const produced = new Set(
      [1, 21, 51, 251, 1001].map((seats) => sizeBucketForSeats(seats)),
    );
    expect([...produced].sort()).toEqual([...SIZE_BUCKETS].sort());
  });
});

describe("levelToUnit", () => {
  it("spreads the three-point scale across 0 to 1", () => {
    expect(levelToUnit("low")).toBe(0);
    expect(levelToUnit("medium")).toBe(0.5);
    expect(levelToUnit("high")).toBe(1);
  });
});
