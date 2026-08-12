import { describe, expect, it } from "vitest";
import { bySeverity, hasBlocker, rationale } from "@/domain/rationale";
import { rationaleItemSchema } from "@/domain/rationale";

describe("rationale items", () => {
  it("defaults to informational severity with empty params and evidence", () => {
    expect(rationale({ code: "rationale.test.plain" })).toEqual({
      code: "rationale.test.plain",
      severity: "info",
      params: {},
      evidence: [],
    });
  });

  it("carries evidence pointing back at the intake field that caused it", () => {
    const item = rationale({
      code: "rationale.hosting.self_hosted_without_linux",
      severity: "caution",
      params: { seats: 180 },
      evidence: [{ field: "operating.linuxCapability", value: "none" }],
    });

    expect(rationaleItemSchema.parse(item)).toEqual(item);
    expect(item.evidence[0]?.field).toBe("operating.linuxCapability");
  });

  it("detects blockers", () => {
    expect(hasBlocker([rationale({ code: "a" })])).toBe(false);
    expect(hasBlocker([rationale({ code: "a", severity: "blocker" })])).toBe(true);
  });

  it("orders the most consequential findings first", () => {
    const ordered = bySeverity([
      rationale({ code: "info" }),
      rationale({ code: "blocker", severity: "blocker" }),
      rationale({ code: "note", severity: "note" }),
      rationale({ code: "caution", severity: "caution" }),
    ]);

    expect(ordered.map((item) => item.code)).toEqual([
      "blocker",
      "caution",
      "note",
      "info",
    ]);
  });

  it("is a stable sort, so engine output stays deterministic", () => {
    const items = [
      rationale({ code: "first", severity: "caution" }),
      rationale({ code: "second", severity: "caution" }),
      rationale({ code: "third", severity: "caution" }),
    ];

    expect(bySeverity(items).map((i) => i.code)).toEqual(["first", "second", "third"]);
    expect(bySeverity(bySeverity(items))).toEqual(bySeverity(items));
  });

  it("does not mutate its input", () => {
    const items = [
      rationale({ code: "info" }),
      rationale({ code: "blocker", severity: "blocker" }),
    ];
    const snapshot = JSON.stringify(items);

    bySeverity(items);
    expect(JSON.stringify(items)).toBe(snapshot);
  });
});
