import type { SourceTool } from "../schema";

/**
 * Products organizations are typically moving away from.
 *
 * These entries exist for two reasons: to offer sensible defaults in the wizard
 * (`commonIn`), and to let migration edges say something specific about a given
 * origin rather than generic advice.
 *
 * `vendorLockIn` is about how hard the product makes leaving — proprietary
 * formats, contract structure, entangled integrations. `dataExportQuality` is
 * about how usable an export actually is once you have it. They are not the same
 * thing: a product can offer a complete export that is painful to reuse.
 */

const REVIEWED = "2026-08-12";

function source(entry: Omit<SourceTool, "lastReviewed" | "reviewStatus">): SourceTool {
  return { ...entry, lastReviewed: REVIEWED, reviewStatus: "draft" };
}

export const sourceTools: SourceTool[] = [
  // --- Office and documents -------------------------------------------------
  source({
    id: "microsoft-365-apps",
    category: "office_docs",
    name: "Microsoft 365 (Word, Excel, PowerPoint)",
    vendorLockIn: 5,
    dataExportQuality: 3,
    commonIn: ["sme", "municipality", "district_office", "school", "utility"],
    sources: ["https://learn.microsoft.com/en-us/microsoft-365/"],
  }),
  source({
    id: "google-workspace-docs",
    category: "office_docs",
    name: "Google Workspace (Docs, Sheets, Slides)",
    vendorLockIn: 4,
    dataExportQuality: 4,
    commonIn: ["sme", "school", "association"],
    sources: ["https://workspace.google.com/"],
  }),
  source({
    id: "ms-office-onprem",
    category: "office_docs",
    name: "Microsoft Office (lokal installiert)",
    vendorLockIn: 4,
    dataExportQuality: 3,
    commonIn: ["sme", "municipality", "district_office", "utility", "association"],
    sources: ["https://learn.microsoft.com/en-us/officeupdates/"],
  }),

  // --- File storage and sharing ---------------------------------------------
  source({
    id: "sharepoint-onedrive",
    category: "file_sharing",
    name: "SharePoint / OneDrive",
    vendorLockIn: 5,
    dataExportQuality: 2,
    commonIn: ["sme", "municipality", "district_office", "school", "utility"],
    sources: ["https://learn.microsoft.com/en-us/sharepoint/"],
  }),
  source({
    id: "dropbox",
    category: "file_sharing",
    name: "Dropbox",
    vendorLockIn: 3,
    dataExportQuality: 4,
    commonIn: ["sme", "association"],
    sources: ["https://help.dropbox.com/"],
  }),
  source({
    id: "google-drive",
    category: "file_sharing",
    name: "Google Drive",
    vendorLockIn: 3,
    dataExportQuality: 4,
    commonIn: ["sme", "school", "association"],
    sources: ["https://support.google.com/drive/"],
  }),
  source({
    id: "windows-file-server",
    category: "file_sharing",
    name: "Windows-Dateiserver / Netzlaufwerk",
    vendorLockIn: 2,
    dataExportQuality: 5,
    commonIn: ["sme", "municipality", "district_office", "utility", "school"],
    sources: ["https://learn.microsoft.com/en-us/windows-server/storage/"],
  }),

  // --- Chat and video -------------------------------------------------------
  source({
    id: "microsoft-teams",
    category: "chat_video",
    name: "Microsoft Teams",
    vendorLockIn: 5,
    dataExportQuality: 2,
    commonIn: ["sme", "municipality", "district_office", "school", "utility"],
    sources: ["https://learn.microsoft.com/en-us/microsoftteams/"],
  }),
  source({
    id: "slack",
    category: "chat_video",
    name: "Slack",
    vendorLockIn: 4,
    dataExportQuality: 3,
    commonIn: ["sme", "association"],
    sources: ["https://slack.com/help"],
  }),
  source({
    id: "zoom",
    category: "chat_video",
    name: "Zoom",
    vendorLockIn: 2,
    dataExportQuality: 4,
    commonIn: ["sme", "school", "association", "municipality"],
    sources: ["https://support.zoom.com/"],
  }),
  source({
    id: "whatsapp-informal",
    category: "chat_video",
    name: "WhatsApp (informell genutzt)",
    vendorLockIn: 3,
    dataExportQuality: 1,
    commonIn: ["association", "school", "sme"],
    sources: ["https://faq.whatsapp.com/"],
  }),

  // --- Intranet and wiki ----------------------------------------------------
  source({
    id: "confluence",
    category: "intranet_wiki",
    name: "Atlassian Confluence",
    vendorLockIn: 4,
    dataExportQuality: 3,
    commonIn: ["sme", "utility", "district_office"],
    sources: ["https://confluence.atlassian.com/"],
  }),
  source({
    id: "sharepoint-intranet",
    category: "intranet_wiki",
    name: "SharePoint-Intranet",
    vendorLockIn: 5,
    dataExportQuality: 2,
    commonIn: ["municipality", "district_office", "utility", "sme"],
    sources: ["https://learn.microsoft.com/en-us/sharepoint/"],
  }),
  source({
    id: "shared-drive-documents",
    category: "intranet_wiki",
    name: "Abgelegte Dokumente ohne Wiki",
    vendorLockIn: 1,
    dataExportQuality: 5,
    commonIn: ["association", "school", "municipality", "sme"],
    sources: ["https://learn.microsoft.com/en-us/windows-server/storage/"],
  }),

  // --- Project management ---------------------------------------------------
  source({
    id: "jira",
    category: "project_management",
    name: "Atlassian Jira",
    vendorLockIn: 4,
    dataExportQuality: 3,
    commonIn: ["sme", "utility"],
    sources: ["https://confluence.atlassian.com/jira/"],
  }),
  source({
    id: "ms-planner-project",
    category: "project_management",
    name: "Microsoft Planner / Project",
    vendorLockIn: 4,
    dataExportQuality: 2,
    commonIn: ["sme", "municipality", "district_office", "utility"],
    sources: ["https://learn.microsoft.com/en-us/project/"],
  }),
  source({
    id: "trello",
    category: "project_management",
    name: "Trello",
    vendorLockIn: 2,
    dataExportQuality: 4,
    commonIn: ["sme", "association", "school"],
    sources: ["https://support.atlassian.com/trello/"],
  }),
  source({
    id: "spreadsheet-planning",
    category: "project_management",
    name: "Planung per Tabellenkalkulation",
    vendorLockIn: 1,
    dataExportQuality: 4,
    commonIn: ["association", "school", "municipality", "sme"],
    sources: ["https://www.documentfoundation.org/"],
  }),

  // --- Helpdesk -------------------------------------------------------------
  source({
    id: "shared-mailbox-helpdesk",
    category: "helpdesk",
    name: "Sammelpostfach ohne Ticketsystem",
    vendorLockIn: 1,
    dataExportQuality: 4,
    commonIn: ["municipality", "school", "association", "sme", "district_office"],
    sources: ["https://learn.microsoft.com/en-us/exchange/"],
  }),
  source({
    id: "jira-service-management",
    category: "helpdesk",
    name: "Jira Service Management",
    vendorLockIn: 4,
    dataExportQuality: 3,
    commonIn: ["sme", "utility"],
    sources: ["https://confluence.atlassian.com/servicemanagement/"],
  }),
  source({
    id: "freshdesk",
    category: "helpdesk",
    name: "Freshdesk",
    vendorLockIn: 3,
    dataExportQuality: 3,
    commonIn: ["sme"],
    sources: ["https://support.freshdesk.com/"],
  }),

  // --- Forms and surveys ----------------------------------------------------
  source({
    id: "microsoft-forms",
    category: "forms_surveys",
    name: "Microsoft Forms",
    vendorLockIn: 3,
    dataExportQuality: 3,
    commonIn: ["sme", "school", "municipality", "district_office"],
    sources: ["https://support.microsoft.com/en-us/office/microsoft-forms"],
  }),
  source({
    id: "google-forms",
    category: "forms_surveys",
    name: "Google Forms",
    vendorLockIn: 3,
    dataExportQuality: 4,
    commonIn: ["school", "association", "sme"],
    sources: ["https://support.google.com/docs/topic/9055404"],
  }),
  source({
    id: "paper-forms",
    category: "forms_surveys",
    name: "Papierformulare",
    vendorLockIn: 1,
    dataExportQuality: 1,
    commonIn: ["municipality", "district_office", "school", "association"],
    sources: ["https://www.onlinezugangsgesetz.de/"],
  }),

  // --- CRM ------------------------------------------------------------------
  source({
    id: "excel-contact-lists",
    category: "crm",
    name: "Kontaktlisten in Tabellen",
    vendorLockIn: 1,
    dataExportQuality: 4,
    commonIn: ["association", "sme", "school", "municipality"],
    sources: ["https://www.documentfoundation.org/"],
  }),
  source({
    id: "salesforce",
    category: "crm",
    name: "Salesforce",
    vendorLockIn: 5,
    dataExportQuality: 3,
    commonIn: ["sme", "utility"],
    sources: ["https://help.salesforce.com/"],
  }),
  source({
    id: "microsoft-dynamics",
    category: "crm",
    name: "Microsoft Dynamics 365",
    vendorLockIn: 5,
    dataExportQuality: 3,
    commonIn: ["sme", "utility"],
    sources: ["https://learn.microsoft.com/en-us/dynamics365/"],
  }),

  // --- DMS and archive ------------------------------------------------------
  source({
    id: "folder-structure-archive",
    category: "dms_archive",
    name: "Ordnerstruktur auf dem Dateiserver",
    vendorLockIn: 1,
    dataExportQuality: 5,
    commonIn: ["sme", "association", "school", "municipality", "district_office"],
    sources: ["https://learn.microsoft.com/en-us/windows-server/storage/"],
  }),
  source({
    id: "paper-archive",
    category: "dms_archive",
    name: "Papierarchiv",
    vendorLockIn: 1,
    dataExportQuality: 1,
    commonIn: ["municipality", "district_office", "association", "school"],
    sources: ["https://www.bundesarchiv.de/"],
  }),
  source({
    id: "sharepoint-dms",
    category: "dms_archive",
    name: "SharePoint als Dokumentenablage",
    vendorLockIn: 5,
    dataExportQuality: 2,
    commonIn: ["sme", "municipality", "district_office", "utility"],
    sources: ["https://learn.microsoft.com/en-us/sharepoint/"],
  }),
];
