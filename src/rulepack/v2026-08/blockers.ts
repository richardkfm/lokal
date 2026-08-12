import { levelToUnit } from "@/domain/enums";
import type { BlockerRule } from "../schema";

/**
 * Rules that stop or qualify a recommendation.
 *
 * `blocker` removes a candidate outright and the report lists it under
 * "considered and ruled out" with this reason. `caution` keeps the candidate but
 * attaches a warning the reader has to see.
 *
 * These encode the mismatches that make a technically sound recommendation fail
 * in practice — the ones a tool comparison never catches because they depend on
 * the organization rather than the software.
 */
export const blockerRules: BlockerRule[] = [
  {
    id: "self-host-without-capability",
    message: "blocker.self_host_without_linux_capability",
    severity: "blocker",
    when: ({ input, target }) =>
      input.operating.linuxCapability === "none" &&
      target.hostingModes.length === 1 &&
      target.hostingModes[0] === "self_hosted" &&
      target.selfHostOpsLoad >= 4,
  },
  {
    id: "community-support-when-vendor-required",
    message: "blocker.community_support_but_vendor_expected",
    severity: "blocker",
    when: ({ input, target }) =>
      input.operating.supportExpectation === "vendor_support_needed" &&
      target.supportModel === "community",
  },
  {
    id: "german-ui-required",
    message: "blocker.insufficient_german_interface",
    severity: "blocker",
    when: ({ input, target }) =>
      input.org.germanLanguageRequired && target.germanUiQuality <= 2,
  },
  {
    id: "beyond-comfortable-seat-range",
    message: "blocker.beyond_comfortable_seat_range",
    severity: "blocker",
    when: ({ entry, target }) =>
      entry.seats > target.seatScalability.comfortableUpTo * 1.5,
  },
  {
    id: "approaching-seat-ceiling",
    message: "caution.approaching_seat_ceiling",
    severity: "caution",
    when: ({ entry, target }) =>
      entry.seats > target.seatScalability.comfortableUpTo &&
      entry.seats <= target.seatScalability.comfortableUpTo * 1.5,
  },
  {
    id: "ops-load-exceeds-capacity",
    message: "caution.ops_load_exceeds_admin_capacity",
    severity: "caution",
    when: ({ input, target }) =>
      input.operating.adminCapacity === "low" &&
      target.selfHostOpsLoad >= 4 &&
      !target.hostingModes.includes("eu_managed"),
  },
  {
    id: "critical-system-poor-coexistence",
    message: "caution.critical_system_cannot_run_in_parallel",
    severity: "caution",
    when: ({ entry, target }) =>
      entry.criticality === "high" && target.coexistence === "poor",
  },
  {
    id: "immature-for-critical-use",
    message: "caution.limited_track_record_for_critical_system",
    severity: "caution",
    when: ({ entry, target }) => entry.criticality === "high" && target.maturity <= 3,
  },
  {
    id: "public-sector-weak-references",
    message: "caution.few_public_sector_references",
    severity: "caution",
    when: ({ input, target }) => input.org.publicSector && target.publicSectorFit <= 2,
  },
  {
    id: "training-load-with-sensitive-staff",
    message: "caution.training_load_meets_sensitivity",
    severity: "caution",
    when: ({ entry, target }) =>
      levelToUnit(entry.trainingSensitivity) === 1 &&
      target.trainingLoad >= 4 &&
      entry.seats >= 50,
  },
  {
    id: "restricted-license-in-public-sector",
    message: "caution.license_carries_use_restrictions",
    severity: "caution",
    when: ({ input, target }) =>
      input.org.publicSector && target.license === "source_available",
  },
  {
    id: "no-german-support-market",
    message: "caution.thin_german_service_market",
    severity: "caution",
    when: ({ input, target }) =>
      input.org.country === "DE" &&
      target.deMarketPresence <= 2 &&
      input.operating.adminCapacity !== "high",
  },
];
