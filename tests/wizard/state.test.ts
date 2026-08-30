import { describe, expect, it } from "vitest";
import {
  copyEntryValues,
  emptyDraft,
  selectCategories,
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

  it("falls back to the org's total seats when a category has none of its own", () => {
    const draft = municipalityDraft();
    delete draft.stack.office_docs?.seats;

    expect(validateStep("detail", draft)).toEqual({});
    expect(toAssessment(draft, "de")?.stack[0]?.seats).toBe(180);
  });

  it("maps validation issues to translation keys, not raw Zod messages", () => {
    const draft = municipalityDraft();
    delete draft.stack.office_docs?.urgency;

    // No translator: falls back to the raw key, never Zod's English text.
    expect(validateStep("detail", draft)["0.urgency"]).toBe("selectOption");

    // A translator is applied when supplied.
    const shout = (key: string) => key.toUpperCase();
    expect(validateStep("detail", draft, shout)["0.urgency"]).toBe("SELECTOPTION");
  });
});

describe("selectCategories", () => {
  /**
   * A newly ticked category answers nothing on the respondent's behalf.
   *
   * This test asserted the opposite until v0.1.0's design review: criticality,
   * Leidensdruck and Dringlichkeit arrived pre-chosen and visually identical to
   * a real answer, and `urgency: "later"` is not a neutral middle — it demotes
   * the category in the roadmap. The "Angaben prüfen" step then showed six of
   * roughly thirty-five answers, so the substitution could not be caught there
   * either. A tool that will not state a savings figure it cannot support must
   * not state a Dringlichkeit nobody gave.
   */
  it("answers nothing on the respondent's behalf for a new category", () => {
    const draft = emptyDraft();
    const next = selectCategories(draft, ["office_docs"]);

    expect(next.stack.office_docs).toEqual({});
    expect(next.selectedCategories).toEqual(["office_docs"]);
  });

  it("never overwrites an already-answered category, even if re-selected", () => {
    const draft: Draft = {
      ...emptyDraft(),
      selectedCategories: ["office_docs"],
      stack: { office_docs: { seats: 42, criticality: "high" } },
    };

    // Toggled off, then back on: the answers already given must survive.
    const toggledOff = selectCategories(draft, []);
    const toggledOn = selectCategories(toggledOff, ["office_docs"]);

    expect(toggledOn.stack.office_docs).toEqual({ seats: 42, criticality: "high" });
  });

  it("orders selected categories by vocabulary order, not click order", () => {
    const draft = emptyDraft();
    const next = selectCategories(draft, ["dms_archive", "office_docs"]);

    expect(next.selectedCategories.indexOf("office_docs")).toBeLessThan(
      next.selectedCategories.indexOf("dms_archive"),
    );
  });
});

describe("copyEntryValues", () => {
  it("copies the rated fields but not the tool-specific ones", () => {
    const patch = copyEntryValues({
      seats: 50,
      criticality: "high",
      pain: "low",
      urgency: "now",
      lockInConcern: "medium",
      trainingSensitivity: "high",
      currentTool: { kind: "other", label: "SharePoint" },
      notes: "irrelevant here",
    });

    expect(patch).toEqual({
      seats: 50,
      criticality: "high",
      pain: "low",
      urgency: "now",
      lockInConcern: "medium",
      trainingSensitivity: "high",
    });
  });

  it("returns an empty patch for an undefined or empty source", () => {
    expect(copyEntryValues(undefined)).toEqual({});
    expect(copyEntryValues({})).toEqual({});
  });
});
