import { describe, expect, it } from "vitest";
import { expertContact } from "@/lib/expert-contact";

/**
 * The contact block is the one part of lokal an operator configures by hand, on
 * a server they may only touch once a year. So the failure modes that matter are
 * "typed it slightly wrong" and "did not set it at all" — neither of which may
 * take down a page someone is in the middle of printing.
 */
describe("expert contact", () => {
  it("is absent when nothing is configured", () => {
    expect(expertContact({})).toBeNull();
  });

  it("reads a full configuration", () => {
    const contact = expertContact({
      LOKAL_EXPERT_NAME: "Maria Schneider",
      LOKAL_EXPERT_ORG: "Beispiel IT-Beratung GmbH",
      LOKAL_EXPERT_EMAIL: "beratung@example.org",
      LOKAL_EXPERT_PHONE: "+49 30 123456",
      LOKAL_EXPERT_URL: "https://example.org/migration",
      LOKAL_EXPERT_NOTE: "Begleitet Kommunen bei Nextcloud-Einführungen.",
    });

    expect(contact).toEqual({
      name: "Maria Schneider",
      org: "Beispiel IT-Beratung GmbH",
      email: "beratung@example.org",
      phone: "+49 30 123456",
      url: "https://example.org/migration",
      note: "Begleitet Kommunen bei Nextcloud-Einführungen.",
    });
  });

  // The whole reason every field is `.catch(undefined)` rather than strict.
  it("drops a malformed field instead of throwing", () => {
    const contact = expertContact({
      LOKAL_EXPERT_NAME: "Maria Schneider",
      LOKAL_EXPERT_EMAIL: "not-an-email",
      LOKAL_EXPERT_PHONE: "+49 30 123456",
      LOKAL_EXPERT_URL: "example.org",
    });

    expect(contact?.name).toBe("Maria Schneider");
    expect(contact?.phone).toBe("+49 30 123456");
    expect(contact?.email).toBeUndefined();
    expect(contact?.url).toBeUndefined();
  });

  // A name with no way to reach anyone is decoration, not a contact.
  it("stays hidden when there is no way to make contact", () => {
    expect(expertContact({ LOKAL_EXPERT_NAME: "Maria Schneider" })).toBeNull();
  });

  it("stays hidden when a contact route is given but nobody is named", () => {
    expect(expertContact({ LOKAL_EXPERT_EMAIL: "beratung@example.org" })).toBeNull();
  });

  it("ignores whitespace-only values", () => {
    expect(
      expertContact({ LOKAL_EXPERT_NAME: "   ", LOKAL_EXPERT_EMAIL: "a@example.org" }),
    ).toBeNull();
  });
});
