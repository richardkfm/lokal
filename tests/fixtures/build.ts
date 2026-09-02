import { parseAssessmentInput } from "@/domain/intake";
import type { AssessmentInput } from "@/domain/intake";
import type {
  AiDeployment,
  AiInterest,
  CategoryId,
  ClientOs,
  DeviceManagement,
  HardwareProfile,
  HostingPreference,
  Level,
  LinuxCapability,
  OrgType,
  SupportExpectation,
  Urgency,
  WindowsOnlyApps,
} from "@/domain/enums";

/**
 * Builds valid assessments for tests.
 *
 * Every override is optional and the defaults describe a plausible mid-sized
 * German municipality, so a test only states the thing it is actually about.
 * The result goes through the real schema, so a fixture can never drift out of
 * shape without failing loudly.
 */
export type AssessmentOverrides = {
  orgType?: OrgType;
  totalSeats?: number;
  departments?: string[];
  publicSector?: boolean;
  germanLanguageRequired?: boolean;

  hostingPreference?: HostingPreference;
  itMaturity?: Level;
  adminCapacity?: Level;
  identityMaturity?: Level;
  linuxCapability?: LinuxCapability;
  supportExpectation?: SupportExpectation;

  clientOs?: ClientOs;
  deviceCount?: number;
  windowsOnlyApps?: WindowsOnlyApps;
  deviceManagement?: DeviceManagement;
  peripheralDependency?: Level;
  /**
   * Rates default to absent rather than to a number, because "no rate declared"
   * is the case most reports are in and the one most worth defaulting to
   * (ADR-0004). A test that wants a cost figure has to ask for one.
   */
  internalDayRateCents?: number;
  externalDayRateCents?: number;

  categories?: CategoryId[];
  categorySeats?: number;
  criticality?: Level;
  pain?: Level;
  urgency?: Urgency;
  lockInConcern?: Level;
  trainingSensitivity?: Level;

  aiInterest?: AiInterest;
  dataSensitivity?: Level;
  aiDeployment?: AiDeployment;
  hardwareProfile?: HardwareProfile;
  aiUseCases?: AssessmentInput["ai"]["useCases"];
};

/** A plausible current tool per category, so fixtures exercise real edges. */
const CURRENT_TOOL: Record<CategoryId, string> = {
  office_docs: "microsoft-365-apps",
  file_sharing: "sharepoint-onedrive",
  chat_video: "microsoft-teams",
  intranet_wiki: "sharepoint-intranet",
  project_management: "ms-planner-project",
  helpdesk: "shared-mailbox-helpdesk",
  forms_surveys: "microsoft-forms",
  crm: "excel-contact-lists",
  dms_archive: "folder-structure-archive",
};

export function assessment(overrides: AssessmentOverrides = {}): AssessmentInput {
  const categories = overrides.categories ?? ["file_sharing", "office_docs"];
  const totalSeats = overrides.totalSeats ?? 180;

  return parseAssessmentInput({
    schemaVersion: 2,
    locale: "de",
    org: {
      orgType: overrides.orgType ?? "municipality",
      country: "DE",
      totalSeats,
      departments: overrides.departments ?? ["Bauamt", "Bürgerbüro", "Kämmerei"],
      publicSector: overrides.publicSector ?? true,
      germanLanguageRequired: overrides.germanLanguageRequired ?? true,
    },
    operating: {
      hostingPreference: overrides.hostingPreference ?? "undecided",
      itMaturity: overrides.itMaturity ?? "medium",
      adminCapacity: overrides.adminCapacity ?? "medium",
      identityMaturity: overrides.identityMaturity ?? "medium",
      linuxCapability: overrides.linuxCapability ?? "basic",
      supportExpectation: overrides.supportExpectation ?? "vendor_support_needed",
    },
    workplace: {
      clientOs: overrides.clientOs ?? "windows",
      deviceCount: overrides.deviceCount,
      windowsOnlyApps: overrides.windowsOnlyApps ?? "few",
      deviceManagement: overrides.deviceManagement ?? "ad_gpo",
      peripheralDependency: overrides.peripheralDependency ?? "medium",
    },
    rates: {
      internalDayRateCents: overrides.internalDayRateCents,
      externalDayRateCents: overrides.externalDayRateCents,
    },
    stack: categories.map((category) => ({
      category,
      currentTool: { kind: "known", id: CURRENT_TOOL[category] },
      seats: overrides.categorySeats ?? totalSeats,
      criticality: overrides.criticality ?? "medium",
      pain: overrides.pain ?? "medium",
      urgency: overrides.urgency ?? "this_year",
      lockInConcern: overrides.lockInConcern ?? "medium",
      trainingSensitivity: overrides.trainingSensitivity ?? "medium",
    })),
    ai: {
      interest: overrides.aiInterest ?? "cautious",
      dataSensitivity: overrides.dataSensitivity ?? "medium",
      deploymentPreference: overrides.aiDeployment ?? "undecided",
      hardwareProfile: overrides.hardwareProfile ?? "office_pcs",
      useCases: overrides.aiUseCases ?? ["summarization"],
    },
  });
}
