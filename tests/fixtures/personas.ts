import { parseAssessmentInput } from "@/domain/intake";
import type { AssessmentInput } from "@/domain/intake";

/**
 * Five canonical organizations.
 *
 * These are the yardstick for the whole engine: any change to weights,
 * thresholds or rule content shows up as a diff in their reports, which is
 * exactly what makes such changes reviewable rather than felt. They are chosen
 * to span the space lokal actually serves — from a fourteen-person association
 * with no IT staff to a nine-hundred-person company with its own Linux team.
 */

export type Persona = {
  id: string;
  /** Why this persona exists — what it exercises that the others do not. */
  purpose: string;
  input: AssessmentInput;
};

export const PERSONAS: Persona[] = [
  {
    id: "association-14",
    purpose:
      "No IT staff, undecided hosting, cautious about AI. Tests that lokal produces a usable plan for an organization with almost no capacity.",
    input: parseAssessmentInput({
      schemaVersion: 2,
      locale: "de",
      org: {
        orgType: "association",
        country: "DE",
        region: "NW",
        totalSeats: 14,
        departments: ["Geschäftsstelle", "Ehrenamt"],
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
      // A mixed estate nobody administers centrally: the case where the OS
      // question is real but the estate cannot be described well enough to
      // answer it, and one Windows-only Vereinsverwaltung sits on it.
      workplace: {
        clientOs: "mixed",
        deviceCount: 16,
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
        {
          category: "chat_video",
          currentTool: { kind: "known", id: "whatsapp-informal" },
          seats: 14,
          criticality: "low",
          pain: "high",
          urgency: "now",
          lockInConcern: "low",
          trainingSensitivity: "medium",
          notes: "Dienstliche Kommunikation läuft über private Konten.",
        },
      ],
      ai: {
        interest: "cautious",
        dataSensitivity: "medium",
        deploymentPreference: "undecided",
        hardwareProfile: "office_pcs",
        useCases: ["summarization"],
      },
    }),
  },

  {
    id: "school-45",
    purpose:
      "Public sector, German required, low admin capacity. Tests public-sector weighting and the training-load penalty on a workforce that cannot absorb much change.",
    input: parseAssessmentInput({
      schemaVersion: 2,
      locale: "de",
      org: {
        orgType: "school",
        country: "DE",
        region: "BY",
        totalSeats: 45,
        departments: ["Kollegium", "Sekretariat", "Schulleitung"],
        publicSector: true,
        germanLanguageRequired: true,
      },
      operating: {
        hostingPreference: "eu_hosted",
        itMaturity: "low",
        adminCapacity: "low",
        identityMaturity: "low",
        linuxCapability: "basic",
        supportExpectation: "vendor_support_needed",
      },
      // Windows on shared classroom machines, no Fachverfahren of its own, and
      // far more devices than staff seats — the persona that proves effort has
      // to scale with machines rather than people.
      workplace: {
        clientOs: "windows",
        deviceCount: 140,
        windowsOnlyApps: "none",
        deviceManagement: "ad_gpo",
        peripheralDependency: "medium",
      },
      rates: { internalDayRateCents: 42_000 },
      stack: [
        {
          category: "file_sharing",
          currentTool: { kind: "known", id: "google-drive" },
          seats: 45,
          criticality: "high",
          pain: "medium",
          urgency: "this_year",
          lockInConcern: "high",
          trainingSensitivity: "high",
        },
        {
          category: "chat_video",
          currentTool: { kind: "known", id: "zoom" },
          seats: 45,
          criticality: "medium",
          pain: "medium",
          urgency: "later",
          lockInConcern: "medium",
          trainingSensitivity: "high",
        },
        {
          category: "forms_surveys",
          currentTool: { kind: "known", id: "google-forms" },
          seats: 12,
          criticality: "low",
          pain: "medium",
          urgency: "this_year",
          lockInConcern: "medium",
          trainingSensitivity: "low",
        },
      ],
      ai: {
        interest: "cautious",
        dataSensitivity: "high",
        deploymentPreference: "on_prem",
        hardwareProfile: "office_pcs",
        useCases: ["summarization", "drafting"],
      },
    }),
  },

  {
    id: "municipality-180",
    purpose:
      "The reference case from the plan's success test. Medium maturity, self-hosting preferred, active AI interest, six categories in scope.",
    input: parseAssessmentInput({
      schemaVersion: 2,
      locale: "de",
      org: {
        orgType: "municipality",
        country: "DE",
        region: "BW",
        totalSeats: 180,
        departments: ["Bauamt", "Bürgerbüro", "Kämmerei", "Ordnungsamt", "Hauptamt"],
        publicSector: true,
        germanLanguageRequired: true,
      },
      operating: {
        hostingPreference: "self_hosted",
        itMaturity: "medium",
        adminCapacity: "medium",
        identityMaturity: "medium",
        linuxCapability: "basic",
        supportExpectation: "vendor_support_needed",
      },
      // The blocking case, and the common one: Fachverfahren the Kommune does
      // not control, group policy, and card readers at every Bürgerbüro desk.
      workplace: {
        clientOs: "windows",
        deviceCount: 195,
        windowsOnlyApps: "many",
        deviceManagement: "ad_gpo",
        peripheralDependency: "high",
      },
      rates: { internalDayRateCents: 48_000, externalDayRateCents: 95_000 },
      stack: [
        {
          category: "office_docs",
          currentTool: { kind: "known", id: "microsoft-365-apps" },
          seats: 180,
          criticality: "high",
          pain: "medium",
          urgency: "this_year",
          lockInConcern: "high",
          trainingSensitivity: "high",
        },
        {
          category: "file_sharing",
          currentTool: { kind: "known", id: "sharepoint-onedrive" },
          seats: 180,
          criticality: "high",
          pain: "high",
          urgency: "now",
          lockInConcern: "high",
          trainingSensitivity: "medium",
        },
        {
          category: "chat_video",
          currentTool: { kind: "known", id: "microsoft-teams" },
          seats: 180,
          criticality: "medium",
          pain: "medium",
          urgency: "this_year",
          lockInConcern: "high",
          trainingSensitivity: "medium",
        },
        {
          category: "helpdesk",
          currentTool: { kind: "known", id: "shared-mailbox-helpdesk" },
          seats: 15,
          criticality: "medium",
          pain: "high",
          urgency: "now",
          lockInConcern: "low",
          trainingSensitivity: "low",
        },
        {
          category: "intranet_wiki",
          currentTool: { kind: "known", id: "shared-drive-documents" },
          seats: 180,
          criticality: "low",
          pain: "medium",
          urgency: "later",
          lockInConcern: "low",
          trainingSensitivity: "low",
        },
        {
          category: "dms_archive",
          currentTool: { kind: "known", id: "paper-archive" },
          seats: 60,
          criticality: "high",
          pain: "high",
          urgency: "later",
          lockInConcern: "low",
          trainingSensitivity: "high",
          notes: "Aufbewahrungspflichten noch ungeklärt.",
        },
      ],
      ai: {
        interest: "active",
        dataSensitivity: "high",
        deploymentPreference: "on_prem",
        hardwareProfile: "server",
        useCases: ["summarization", "document_qa", "ticket_triage"],
      },
    }),
  },

  {
    id: "utility-600",
    purpose:
      "High criticality throughout, vendor support required, high data sensitivity. Tests the critical-work spreading constraint and support-model filtering at scale.",
    input: parseAssessmentInput({
      schemaVersion: 2,
      locale: "de",
      org: {
        orgType: "utility",
        country: "DE",
        region: "NI",
        totalSeats: 600,
        departments: [
          "Netzbetrieb",
          "Kundenservice",
          "Abrechnung",
          "Technik",
          "Verwaltung",
        ],
        publicSector: true,
        germanLanguageRequired: true,
      },
      operating: {
        hostingPreference: "self_hosted",
        itMaturity: "high",
        adminCapacity: "medium",
        identityMaturity: "high",
        linuxCapability: "strong",
        supportExpectation: "vendor_support_needed",
      },
      // Windows desks in front of process control that will never move, with
      // the Linux server skills to do the rest — a mixed estate is the honest
      // outcome here, not a failure.
      workplace: {
        clientOs: "windows",
        deviceCount: 640,
        windowsOnlyApps: "several",
        deviceManagement: "ad_gpo",
        peripheralDependency: "high",
      },
      rates: { internalDayRateCents: 52_000, externalDayRateCents: 110_000 },
      stack: [
        {
          category: "file_sharing",
          currentTool: { kind: "known", id: "sharepoint-onedrive" },
          seats: 600,
          criticality: "high",
          pain: "medium",
          urgency: "this_year",
          lockInConcern: "high",
          trainingSensitivity: "medium",
        },
        {
          category: "helpdesk",
          currentTool: { kind: "known", id: "jira-service-management" },
          seats: 40,
          criticality: "high",
          pain: "high",
          urgency: "now",
          lockInConcern: "high",
          trainingSensitivity: "medium",
        },
        {
          category: "project_management",
          currentTool: { kind: "known", id: "jira" },
          seats: 120,
          criticality: "high",
          pain: "medium",
          urgency: "this_year",
          lockInConcern: "high",
          trainingSensitivity: "high",
        },
        {
          category: "intranet_wiki",
          currentTool: { kind: "known", id: "confluence" },
          seats: 600,
          criticality: "medium",
          pain: "medium",
          urgency: "this_year",
          lockInConcern: "high",
          trainingSensitivity: "medium",
        },
      ],
      ai: {
        interest: "cautious",
        dataSensitivity: "high",
        deploymentPreference: "on_prem",
        hardwareProfile: "server",
        useCases: ["ticket_triage", "document_qa"],
      },
    }),
  },

  {
    id: "sme-900",
    purpose:
      "Strong Linux capability, GPU-capable, aggressive timeline, community-tolerant. Tests the upper end of readiness and the AI lane at its most permissive.",
    input: parseAssessmentInput({
      schemaVersion: 2,
      locale: "de",
      org: {
        orgType: "sme",
        country: "DE",
        region: "HE",
        totalSeats: 900,
        departments: ["Entwicklung", "Vertrieb", "Produktion", "Verwaltung"],
        publicSector: false,
        germanLanguageRequired: false,
      },
      operating: {
        hostingPreference: "self_hosted",
        itMaturity: "high",
        adminCapacity: "high",
        identityMaturity: "high",
        linuxCapability: "strong",
        supportExpectation: "community_tolerant",
      },
      // Already off Windows on the desktop. The verdict has to say what that
      // removes from the plan rather than staying silent about a solved problem.
      workplace: {
        clientOs: "linux",
        deviceCount: 900,
        windowsOnlyApps: "none",
        deviceManagement: "mdm",
        peripheralDependency: "low",
      },
      rates: { internalDayRateCents: 61_000, externalDayRateCents: 120_000 },
      stack: [
        {
          category: "office_docs",
          currentTool: { kind: "known", id: "google-workspace-docs" },
          seats: 900,
          criticality: "medium",
          pain: "medium",
          urgency: "this_year",
          lockInConcern: "high",
          trainingSensitivity: "medium",
        },
        {
          category: "file_sharing",
          currentTool: { kind: "known", id: "google-drive" },
          seats: 900,
          criticality: "high",
          pain: "high",
          urgency: "now",
          lockInConcern: "high",
          trainingSensitivity: "low",
        },
        {
          category: "chat_video",
          currentTool: { kind: "known", id: "slack" },
          seats: 900,
          criticality: "high",
          pain: "medium",
          urgency: "now",
          lockInConcern: "high",
          trainingSensitivity: "low",
        },
        {
          category: "project_management",
          currentTool: { kind: "known", id: "jira" },
          seats: 300,
          criticality: "medium",
          pain: "high",
          urgency: "now",
          lockInConcern: "high",
          trainingSensitivity: "medium",
        },
        {
          category: "crm",
          currentTool: { kind: "known", id: "salesforce" },
          seats: 60,
          criticality: "high",
          pain: "low",
          urgency: "later",
          lockInConcern: "high",
          trainingSensitivity: "high",
        },
      ],
      ai: {
        interest: "active",
        dataSensitivity: "medium",
        deploymentPreference: "on_prem",
        hardwareProfile: "gpu_capable",
        useCases: ["summarization", "drafting", "document_qa", "knowledge_assistant"],
      },
    }),
  },
];

export function persona(id: string): Persona {
  const found = PERSONAS.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`No persona "${id}"`);
  return found;
}
