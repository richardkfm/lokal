/**
 * The shared vocabulary of lokal.
 *
 * Every value is a stable identifier, never display text. Labels live in the
 * message catalogs (`messages/*.json`) under matching keys, so the engine can
 * reason about organizations without ever holding a localized string.
 *
 * Values are declared as `const` tuples so that both the TypeScript union and the
 * Zod schema derive from one list. Adding a member in one place is impossible.
 */

/** Generic three-point scale, used wherever a finer scale would be false precision. */
export const LEVELS = ["low", "medium", "high"] as const;
export type Level = (typeof LEVELS)[number];

export const ORG_TYPES = [
  "sme",
  "municipality",
  "district_office",
  "school",
  "utility",
  "association",
] as const;
export type OrgType = (typeof ORG_TYPES)[number];

/**
 * Organization types that carry public-sector expectations — procurement rules,
 * accessibility duties, records retention, political oversight — regardless of
 * whether the respondent ticked the public-sector box.
 */
export const INHERENTLY_PUBLIC_ORG_TYPES = [
  "municipality",
  "district_office",
  "school",
  "utility",
] as const satisfies readonly OrgType[];

export const COUNTRIES = ["DE", "AT", "CH", "EU_OTHER"] as const;
export type Country = (typeof COUNTRIES)[number];

/** The sixteen German states. Optional in intake; used for context in the report. */
export const GERMAN_REGIONS = [
  "BW",
  "BY",
  "BE",
  "BB",
  "HB",
  "HH",
  "HE",
  "MV",
  "NI",
  "NW",
  "RP",
  "SL",
  "SN",
  "ST",
  "SH",
  "TH",
] as const;
export type GermanRegion = (typeof GERMAN_REGIONS)[number];

/**
 * Size buckets are *derived* from the seat count rather than asked for
 * separately. Collecting both invites a contradiction ("21-50" alongside 400
 * seats) that the engine would then have to arbitrate.
 */
export const SIZE_BUCKETS = ["1-20", "21-50", "51-250", "251-1000", "1000+"] as const;
export type SizeBucket = (typeof SIZE_BUCKETS)[number];

export const HOSTING_PREFERENCES = ["self_hosted", "eu_hosted", "undecided"] as const;
export type HostingPreference = (typeof HOSTING_PREFERENCES)[number];

/** How a candidate tool can actually be operated. */
export const HOSTING_MODES = [
  "self_hosted",
  "eu_managed",
  "eu_saas",
  "local_device",
] as const;
export type HostingMode = (typeof HOSTING_MODES)[number];

/**
 * The IT team's ability to run Linux **servers**, which is what decides whether
 * self-hosting is realistic. Deliberately not a statement about the desktop:
 * `CLIENT_OS` below is what runs on the workstations, and an organization can
 * easily have strong server skills and a Windows estate, or neither.
 */
export const LINUX_CAPABILITIES = ["none", "basic", "strong"] as const;
export type LinuxCapability = (typeof LINUX_CAPABILITIES)[number];

/**
 * What runs on the workstations.
 *
 * `unknown` is a real answer, not a missing one. Assessments taken before the
 * workplace block existed carry it, and so does a respondent who genuinely does
 * not know — an estate nobody can describe is itself a finding, and the report
 * says so rather than assuming Windows.
 */
export const CLIENT_OS = ["windows", "macos", "mixed", "linux", "unknown"] as const;
export type ClientOs = (typeof CLIENT_OS)[number];

/**
 * Applications that only run on Windows — Fachverfahren, tax and payroll
 * packages, CAD, lab and machine control software.
 *
 * This is the single question that decides whether a desktop migration is
 * possible at all, which is why it is asked as a count band rather than folded
 * into a generic difficulty level. One irreplaceable Windows-only Fachverfahren
 * ends the lane for the workstations that need it, however good everything else
 * looks.
 */
export const WINDOWS_ONLY_APPS = ["none", "few", "several", "many", "unknown"] as const;
export type WindowsOnlyApps = (typeof WINDOWS_ONLY_APPS)[number];

/**
 * How software and settings reach the workstations today.
 *
 * `ad_gpo` matters beyond deployment: an estate managed through group policy
 * has its desktop configuration entangled with its directory, so the operating
 * system cannot move before the directory question is answered.
 */
export const DEVICE_MANAGEMENT = ["none", "ad_gpo", "mdm", "other", "unknown"] as const;
export type DeviceManagement = (typeof DEVICE_MANAGEMENT)[number];

/**
 * The verdict on the client operating system.
 *
 * `keep for now` applied to the desktop. `after_apps` is the normal answer and
 * carries the gate conditions that are not yet met; `blocked` names what blocks
 * it; `not_assessed` says which question to answer. None of them names a
 * distribution — see ADR-0004's companion deferral in plans/roadmap.md.
 */
export const CLIENT_OS_VERDICTS = [
  "not_assessed",
  "already_open",
  "blocked",
  "after_apps",
] as const;
export type ClientOsVerdict = (typeof CLIENT_OS_VERDICTS)[number];

export const SUPPORT_EXPECTATIONS = [
  "community_tolerant",
  "vendor_support_needed",
] as const;
export type SupportExpectation = (typeof SUPPORT_EXPECTATIONS)[number];

export const SUPPORT_MODELS = [
  "community",
  "commercial_available",
  "vendor_backed",
] as const;
export type SupportModel = (typeof SUPPORT_MODELS)[number];

export const URGENCIES = ["now", "this_year", "later"] as const;
export type Urgency = (typeof URGENCIES)[number];

/**
 * The nine software categories lokal plans for. CRM and DMS/archive are covered
 * more narrowly than the other seven; the rulepack marks that explicitly so the
 * report can say so rather than implying equal depth.
 */
export const CATEGORY_IDS = [
  "office_docs",
  "chat_video",
  "file_sharing",
  "project_management",
  "helpdesk",
  "intranet_wiki",
  "forms_surveys",
  "crm",
  "dms_archive",
] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];

export const AI_INTERESTS = ["none", "cautious", "active"] as const;
export type AiInterest = (typeof AI_INTERESTS)[number];

export const AI_DEPLOYMENTS = [
  "local_device",
  "on_prem",
  "eu_hosted",
  "undecided",
] as const;
export type AiDeployment = (typeof AI_DEPLOYMENTS)[number];

export const HARDWARE_PROFILES = [
  "none",
  "office_pcs",
  "server",
  "gpu_capable",
] as const;
export type HardwareProfile = (typeof HARDWARE_PROFILES)[number];

export const AI_USE_CASE_IDS = [
  "summarization",
  "document_qa",
  "drafting",
  "ticket_triage",
  "knowledge_assistant",
] as const;
export type AiUseCaseId = (typeof AI_USE_CASE_IDS)[number];

/** Recommendation timing for an AI use case. "later" always carries a reason. */
export const AI_TIMINGS = ["now", "pilot", "later"] as const;
export type AiTiming = (typeof AI_TIMINGS)[number];

export const COEXISTENCE = ["good", "partial", "poor"] as const;
export type Coexistence = (typeof COEXISTENCE)[number];

export const LICENSES = [
  "agpl",
  "gpl",
  "lgpl",
  "mpl",
  "apache",
  "mit",
  "open_core",
  "source_available",
] as const;
export type License = (typeof LICENSES)[number];

/** Qualitative outlook bands. lokal never states euro amounts. */
export const OUTLOOK_BANDS = ["low", "moderate", "strong"] as const;
export type OutlookBand = (typeof OUTLOOK_BANDS)[number];

/** Readiness labels attached to a 0–100 band score. */
export const READINESS_LABELS = ["weak", "developing", "solid", "strong"] as const;
export type ReadinessLabel = (typeof READINESS_LABELS)[number];

/** Severity of a rationale item. `blocker` stops a recommendation outright. */
export const RATIONALE_SEVERITIES = ["info", "note", "caution", "blocker"] as const;
export type RationaleSeverity = (typeof RATIONALE_SEVERITIES)[number];

/** Coarse 1–5 rating used throughout the rulepack. */
export const SCORE_5 = [1, 2, 3, 4, 5] as const;
export type Score5 = (typeof SCORE_5)[number];

/** How thoroughly the rulepack covers a category. */
export const COVERAGE_DEPTHS = ["full", "focused"] as const;
export type CoverageDepth = (typeof COVERAGE_DEPTHS)[number];

/**
 * The parts an effort band decomposes into.
 *
 * A single range is not an explanation. These name the work behind it, each
 * emitted only when a signal in the assessment justifies it — so a plan with no
 * training load shows no training package rather than a zero.
 *
 * Order is the order the work happens in, and renderers rely on it.
 */
export const WORK_PACKAGES = [
  "preparation",
  "data_migration",
  "pilot",
  "rollout",
  "training",
  "parallel_run",
  "aftercare",
] as const;
export type WorkPackage = (typeof WORK_PACKAGES)[number];

/** Migration phases. Phase 0 is preparation, phase 4 is optimization and AI. */
export const PHASE_IDS = [0, 1, 2, 3, 4] as const;
export type PhaseId = (typeof PHASE_IDS)[number];

/**
 * Derives the size bucket from a seat count. Buckets exist for reporting and
 * for rules that behave differently at organizational scale, not as a separate
 * question.
 */
export function sizeBucketForSeats(seats: number): SizeBucket {
  if (seats <= 20) return "1-20";
  if (seats <= 50) return "21-50";
  if (seats <= 250) return "51-250";
  if (seats <= 1000) return "251-1000";
  return "1000+";
}

/** Maps a three-point level onto 0, 0.5, 1 for weighted scoring. */
export function levelToUnit(level: Level): number {
  return level === "low" ? 0 : level === "medium" ? 0.5 : 1;
}
