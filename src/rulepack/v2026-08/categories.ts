import type { Category } from "../schema";

/**
 * The nine categories lokal plans for.
 *
 * `coverageDepth` is honest signalling. Seven categories are researched in
 * comparable depth. CRM and DMS/archive are covered more narrowly: the German
 * DMS market in particular is fragmented and entangled with retention law, and
 * pretending to equal depth there would be the kind of overreach that costs the
 * whole report its credibility.
 */
export const categories: Category[] = [
  {
    id: "office_docs",
    label: { de: "Office und Dokumente", en: "Office and documents" },
    description: {
      de: "Textverarbeitung, Tabellen, Präsentationen und gemeinsames Bearbeiten von Dokumenten.",
      en: "Word processing, spreadsheets, presentations and collaborative editing.",
    },
    provides: [],
    coverageDepth: "full",
    displayOrder: 0,
  },
  {
    id: "file_sharing",
    label: { de: "Dateiablage und Austausch", en: "File storage and sharing" },
    description: {
      de: "Zentrale Dateiablage, Synchronisation und der Austausch von Dateien mit Externen.",
      en: "Central file storage, synchronization and sharing files with external parties.",
    },
    provides: ["file-platform"],
    coverageDepth: "full",
    displayOrder: 1,
  },
  {
    id: "chat_video",
    label: { de: "Chat und Videokonferenz", en: "Chat and video conferencing" },
    description: {
      de: "Interne Kommunikation in Kanälen und Direktnachrichten sowie Besprechungen per Video.",
      en: "Internal communication in channels and direct messages, plus video meetings.",
    },
    provides: [],
    coverageDepth: "full",
    displayOrder: 2,
  },
  {
    id: "intranet_wiki",
    label: { de: "Intranet und Wissensablage", en: "Intranet and knowledge base" },
    description: {
      de: "Interne Dokumentation, Handbücher, Richtlinien und redaktionelle Inhalte.",
      en: "Internal documentation, handbooks, policies and editorial content.",
    },
    provides: [],
    coverageDepth: "full",
    displayOrder: 3,
  },
  {
    id: "project_management",
    label: { de: "Projekt- und Aufgabenverwaltung", en: "Project and task management" },
    description: {
      de: "Planung von Vorhaben, Aufgabenverteilung und Nachverfolgung von Terminen.",
      en: "Planning work, assigning tasks and tracking deadlines.",
    },
    provides: [],
    coverageDepth: "full",
    displayOrder: 4,
  },
  {
    id: "helpdesk",
    label: { de: "Helpdesk und Ticketsystem", en: "Helpdesk and ticketing" },
    description: {
      de: "Anfragen von Beschäftigten oder Bürgerinnen und Bürgern strukturiert bearbeiten.",
      en: "Handling requests from staff or citizens in a structured way.",
    },
    provides: [],
    coverageDepth: "full",
    displayOrder: 5,
  },
  {
    id: "forms_surveys",
    label: { de: "Formulare und Umfragen", en: "Forms and surveys" },
    description: {
      de: "Online-Formulare, Anmeldungen, Rückmeldungen und Befragungen.",
      en: "Online forms, registrations, feedback and surveys.",
    },
    provides: [],
    coverageDepth: "full",
    displayOrder: 6,
  },
  {
    id: "crm",
    label: {
      de: "Kontakt- und Kundenverwaltung",
      en: "Contact and customer management",
    },
    description: {
      de: "Verwaltung von Kontakten, Mitgliedern, Kundinnen und Kunden sowie zugehöriger Vorgänge.",
      en: "Managing contacts, members and customers, and the processes around them.",
    },
    provides: [],
    coverageDepth: "focused",
    displayOrder: 7,
  },
  {
    id: "dms_archive",
    label: {
      de: "Dokumentenmanagement und Archiv",
      en: "Document management and archiving",
    },
    description: {
      de: "Strukturierte Ablage, Aufbewahrung und Wiederauffindbarkeit von Geschäftsdokumenten. Rechtliche Aufbewahrungspflichten sind gesondert mit fachkundiger Beratung zu prüfen.",
      en: "Structured filing, retention and retrievability of business documents. Legal retention duties must be assessed separately with qualified advice.",
    },
    provides: [],
    coverageDepth: "focused",
    displayOrder: 8,
  },
];
