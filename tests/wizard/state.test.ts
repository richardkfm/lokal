import { describe, expect, it } from "vitest";
import {
  emptyDraft,
  toAssessment,
  validateStep,
  type Draft,
} from "@/components/wizard/state";

/**
 * Draft assembly.
 *
 * `toAssessment` and `validateStep` are the two pure functions in the wizard,
 * and they are where a draft turns into something the engine will accept. The
 * hooks around them need a browser; these do not.
 */

function municipalityDraft(): Draft {
  return {
    ...emptyDraft(),
    org: {
      orgType: "municipality",
      country: "DE",
      totalSeats: 180,
      departments: ["Bauamt"],
      publicSector: true,
      germanLanguageRequired: true,
    },
    operating: {
      hostingPreference: "self_hosted",
      itMaturity: "medium",
      adminCapacity: "low",
      identityMaturity: "medium",
      linuxCapability: "basic",
      supportExpectation: "vendor_support_needed",
    },
    selectedCategories: ["office_docs"],
    stack: {
      office_docs: {
        seats: 175,
        criticality: "high",
        pain: "medium",
        urgency: "this_year",
        lockInConcern: "high",
        trainingSensitivity: "high",
      },
    },
    ai: {
      interest: "cautious",
      dataSensitivity: "high",
      deploymentPreference: "local_device",
      hardwareProfile: "office_pcs",
      useCases: ["summarization"],
    },
  };
}

describe("draft assembly", () => {
  it("treats an untouched current-tool field as nothing in use", () => {
    // The detail step tells the user to leave the field empty when they have no
    // tool in that category. Before this default, doing exactly that blocked the
    // step with no error anywhere on screen.
    const draft = municipalityDraft();
    expect(draft.stack.office_docs?.currentTool).toBeUndefined();

    expect(validateStep("detail", draft)).toEqual({});

    const assessment = toAssessment(draft, "de");
    expect(assessment?.stack[0]?.currentTool).toEqual({ kind: "none" });
  });

  it("keeps a named current tool", () => {
    const draft = municipalityDraft();
    draft.stack.office_docs!.currentTool = { kind: "other", label: "Microsoft 365" };

    expect(toAssessment(draft, "de")?.stack[0]?.currentTool).toEqual({
      kind: "other",
      label: "Microsoft 365",
    });
  });

  it("reports per-entry issues against the index the detail step renders", () => {
    const draft = municipalityDraft();
    delete draft.stack.office_docs?.urgency;

    expect(Object.keys(validateStep("detail", draft))).toContain("0.urgency");
  });

  it("returns null while the draft is incomplete", () => {
    expect(toAssessment(emptyDraft(), "de")).toBeNull();
  });
});
