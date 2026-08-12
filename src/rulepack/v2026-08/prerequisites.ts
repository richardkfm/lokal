import type { Prerequisite } from "../schema";

/**
 * Groundwork that has to exist before a migration can succeed.
 *
 * Prerequisites are what fill phase 0. They are gathered from everything
 * scheduled later, which is why phase 0 is never empty in a real plan and why
 * "we'll sort out accounts as we go" shows up as a sequencing error rather than
 * an afterthought.
 */
export const prerequisites: Prerequisite[] = [
  {
    id: "identity-directory",
    label: { de: "Zentrale Benutzerverwaltung", en: "Central user directory" },
    description: {
      de: "Ein gemeinsames Verzeichnis für Konten und Gruppen, auf das die neuen Systeme zugreifen. Ohne diesen Schritt entsteht bei jeder Einführung eine eigene Benutzerliste — der häufigste Grund dafür, dass Migrationen später unbeherrschbar werden.",
      en: "A shared directory of accounts and groups the new systems can use. Without it, every rollout creates its own user list — the most common reason migrations become unmanageable later.",
    },
    kind: "identity",
    effort: 4,
  },
  {
    id: "file-platform",
    label: { de: "Dateiplattform als Grundlage", en: "File platform in place" },
    description: {
      de: "Eine betriebsbereite Dateiablage, auf der Dokumentenbearbeitung, Formulare oder Chat aufsetzen können.",
      en: "A running file platform that document editing, forms or chat can build on.",
    },
    kind: "storage",
    effort: 3,
  },
  {
    id: "backup-restore",
    label: {
      de: "Sicherung und erprobte Rücksicherung",
      en: "Backup and tested restore",
    },
    description: {
      de: "Eine Datensicherung, deren Rücksicherung tatsächlich einmal durchgeführt wurde. Eine ungetestete Sicherung ist im Ernstfall keine Sicherung.",
      en: "A backup whose restore has actually been performed once. An untested backup is not a backup when it matters.",
    },
    kind: "process",
    effort: 3,
  },
  {
    id: "endpoint-management",
    label: {
      de: "Softwareverteilung auf Arbeitsplätzen",
      en: "Endpoint software deployment",
    },
    description: {
      de: "Ein Weg, Software auf die Arbeitsplatzrechner zu bringen, ohne jedes Gerät einzeln anzufassen.",
      en: "A way to get software onto workstations without touching each device individually.",
    },
    kind: "process",
    effort: 3,
  },
  {
    id: "network-capacity",
    label: { de: "Ausreichende Netzanbindung", en: "Sufficient network capacity" },
    description: {
      de: "Genügend Bandbreite für Videokonferenzen und den gleichzeitigen Zugriff vieler Beschäftigter. Bei mehreren Standorten getrennt zu prüfen.",
      en: "Enough bandwidth for video meetings and many staff working at once. To be checked per site where there are several.",
    },
    kind: "network",
    effort: 2,
  },
  {
    id: "communication-policy",
    label: {
      de: "Verbindliche Kommunikationsregeln",
      en: "Agreed communication rules",
    },
    description: {
      de: "Eine Verständigung darüber, welcher Kanal wofür genutzt wird. Ohne diese Klärung entsteht neben dem neuen System einfach ein weiterer Kanal, statt einen alten abzulösen.",
      en: "An agreement on which channel is used for what. Without it, a new system becomes one more channel rather than replacing an old one.",
    },
    kind: "process",
    effort: 2,
  },
  {
    id: "content-ownership",
    label: { de: "Zuständigkeit für Inhalte", en: "Named content owners" },
    description: {
      de: "Benannte Personen, die für die Pflege der Inhalte verantwortlich sind. Wissensablagen ohne Zuständigkeit veralten innerhalb eines Jahres.",
      en: "Named people responsible for maintaining content. Knowledge bases without ownership go stale within a year.",
    },
    kind: "process",
    effort: 2,
  },
  {
    id: "process-ownership",
    label: { de: "Fachliche Federführung", en: "Business process ownership" },
    description: {
      de: "Eine fachlich zuständige Stelle, die entscheidet, wie der Ablauf im neuen System abgebildet wird. Rein technisch geführte Einführungen scheitern an dieser Stelle regelmäßig.",
      en: "A business owner who decides how the process is represented in the new system. Purely technically led rollouts regularly fail here.",
    },
    kind: "process",
    effort: 3,
  },
  {
    id: "data-inventory",
    label: { de: "Bestandsaufnahme der Daten", en: "Data inventory" },
    description: {
      de: "Ein Überblick darüber, welche Daten vorhanden sind, wo sie liegen und wer sie braucht. Grundlage jeder Migrationsplanung.",
      en: "An overview of what data exists, where it lives and who needs it. The basis of any migration planning.",
    },
    kind: "process",
    effort: 3,
  },
  {
    id: "retention-review",
    label: {
      de: "Klärung der Aufbewahrungspflichten",
      en: "Retention duties clarified",
    },
    description: {
      de: "Eine mit fachkundiger Beratung abgestimmte Festlegung, welche Unterlagen wie lange und in welcher Form aufzubewahren sind. lokal trifft hierzu bewusst keine Aussage.",
      en: "A determination, made with qualified advice, of which records must be kept, for how long and in what form. lokal deliberately makes no statement here.",
    },
    kind: "process",
    effort: 4,
  },
];
