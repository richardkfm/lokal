import type { MigrationEdge } from "../schema";

/**
 * What is specific about moving from one product to another.
 *
 * `from: "*"` states what holds for any move into that target. A named origin
 * overrides the generic case, which is where the genuinely useful advice lives:
 * leaving Teams for Matrix is a different problem from leaving Slack for Matrix,
 * and a plan that treats them identically is not worth much.
 *
 * `gotchas` are message codes, so the warnings are translated in renderers rather
 * than baked into rule data.
 */

const REVIEWED = "2026-08-12";

function edge(
  entry: Omit<MigrationEdge, "lastReviewed" | "reviewStatus">,
): MigrationEdge {
  return { ...entry, lastReviewed: REVIEWED, reviewStatus: "draft" };
}

export const migrationEdges: MigrationEdge[] = [
  // --- Into file platforms --------------------------------------------------
  edge({
    from: "sharepoint-onedrive",
    to: "nextcloud",
    complexityDelta: 2,
    dataMigration: {
      effort: 4,
      toolingExists: true,
      notes: {
        de: "Die Dateien selbst lassen sich übertragen. Aufwendig sind die gewachsenen Freigaben, verschachtelte Berechtigungen und Verknüpfungen aus anderen Anwendungen. Diese Nacharbeit wird fast immer unterschätzt.",
        en: "The files themselves transfer. The effort sits in accumulated shares, nested permissions and links from other applications. This follow-up work is almost always underestimated.",
      },
    },
    coexistenceNotes: {
      de: "Ein Parallelbetrieb ist möglich, sollte aber befristet werden. Zwei aktive Ablagen führen verlässlich zu doppelten Dateiständen.",
      en: "Running both is possible but should be time-boxed. Two active repositories reliably produce duplicate file states.",
    },
    gotchas: [
      "gotcha.permissions_inherited_deeply",
      "gotcha.links_from_other_systems",
      "gotcha.long_file_paths",
    ],
    sources: [
      "https://docs.nextcloud.com/",
      "https://learn.microsoft.com/en-us/sharepoint/",
    ],
  }),
  edge({
    from: "windows-file-server",
    to: "nextcloud",
    complexityDelta: -1,
    dataMigration: {
      effort: 2,
      toolingExists: true,
      notes: {
        de: "Eine gewachsene Ordnerstruktur lässt sich vergleichsweise geradlinig übernehmen. Der eigentliche Gewinn liegt im Zugriff von außerhalb, der bisher meist über Umwege gelöst wurde.",
        en: "An established folder structure transfers comparatively cleanly. The real gain is outside access, which was previously solved through workarounds.",
      },
    },
    gotchas: ["gotcha.deep_folder_nesting", "gotcha.orphaned_permissions"],
    sources: ["https://docs.nextcloud.com/"],
  }),
  edge({
    from: "dropbox",
    to: "nextcloud",
    complexityDelta: -1,
    dataMigration: {
      effort: 2,
      toolingExists: true,
      notes: {
        de: "Der Umstieg ist technisch überschaubar, weil die Bedienung ähnlich ist. Externe Freigabelinks müssen neu erzeugt und den Empfängern mitgeteilt werden.",
        en: "Technically straightforward since handling is similar. External share links must be recreated and communicated to recipients.",
      },
    },
    gotchas: ["gotcha.external_share_links_break"],
    sources: ["https://docs.nextcloud.com/"],
  }),

  // --- Into office suites ---------------------------------------------------
  edge({
    from: "microsoft-365-apps",
    to: "collabora-online",
    complexityDelta: 1,
    dataMigration: {
      effort: 3,
      toolingExists: true,
      notes: {
        de: "Alltägliche Dokumente lassen sich gut übernehmen. Problematisch sind Tabellen mit Makros, verknüpfte Arbeitsmappen und aufwendig gestaltete Vorlagen — diese sollten vorab gezielt gesucht und einzeln bewertet werden.",
        en: "Everyday documents transfer well. The problems are macro-heavy spreadsheets, linked workbooks and elaborately designed templates — these should be searched for and assessed individually in advance.",
      },
    },
    coexistenceNotes: {
      de: "Ein befristeter Parallelbetrieb für einzelne Fachbereiche mit Sonderanforderungen ist meist sinnvoller als ein harter Schnitt für alle.",
      en: "A time-boxed parallel period for individual departments with special requirements usually beats a hard cutover for everyone.",
    },
    gotchas: [
      "gotcha.macro_heavy_spreadsheets",
      "gotcha.linked_workbooks",
      "gotcha.template_formatting_drift",
    ],
    sources: ["https://sdk.collaboraonline.com/docs/", "https://www.libreoffice.org/"],
  }),
  edge({
    from: "microsoft-365-apps",
    to: "onlyoffice-docs",
    complexityDelta: 0,
    dataMigration: {
      effort: 2,
      toolingExists: true,
      notes: {
        de: "Die Formatverarbeitung ist eng an die gewohnten Office-Dateien angelehnt, wodurch weniger Nacharbeit an Layouts anfällt. Makros bleiben dennoch ein Sonderfall.",
        en: "Format handling stays close to familiar Office files, so less layout rework is needed. Macros remain a special case regardless.",
      },
    },
    gotchas: ["gotcha.macro_heavy_spreadsheets"],
    sources: ["https://helpcenter.onlyoffice.com/"],
  }),

  // --- Into chat ------------------------------------------------------------
  edge({
    from: "microsoft-teams",
    to: "element-matrix",
    complexityDelta: 2,
    dataMigration: {
      effort: 4,
      toolingExists: false,
      notes: {
        de: "Der Gesprächsverlauf lässt sich praktisch nicht sinnvoll übernehmen. Üblich ist ein Stichtag mit lesendem Zugriff auf das Altsystem für eine Übergangszeit. Schwerer wiegt, dass Teams zugleich als Dateiablage und Besprechungswerkzeug genutzt wird — diese Anteile müssen getrennt geplant werden.",
        en: "Conversation history effectively cannot be carried over. The usual approach is a cutover date with read access to the old system for a transition period. More significantly, Teams doubles as file storage and meeting tool — those parts need planning separately.",
      },
    },
    coexistenceNotes: {
      de: "Ein langer Parallelbetrieb ist hier besonders schädlich: Beschäftigte weichen im Zweifel auf das vertraute System aus, und die Umstellung kommt nie zum Abschluss.",
      en: "A long parallel period is especially harmful here: when in doubt staff fall back to the familiar system and the migration never completes.",
    },
    gotchas: [
      "gotcha.chat_history_not_portable",
      "gotcha.teams_is_also_file_storage",
      "gotcha.meeting_links_in_calendar_invites",
    ],
    sources: ["https://matrix.org/docs/", "https://element.io/"],
  }),
  edge({
    from: "slack",
    to: "mattermost",
    complexityDelta: -1,
    dataMigration: {
      effort: 2,
      toolingExists: true,
      notes: {
        de: "Aufbau und Bedienung sind sich sehr ähnlich, der Umstieg fällt den Beschäftigten entsprechend leicht. Ein Import vorhandener Kanäle ist grundsätzlich möglich.",
        en: "Structure and handling are very similar, so staff adapt easily. Importing existing channels is possible in principle.",
      },
    },
    gotchas: ["gotcha.integrations_need_rebuilding"],
    sources: ["https://docs.mattermost.com/"],
  }),
  edge({
    from: "whatsapp-informal",
    to: "element-matrix",
    complexityDelta: -1,
    dataMigration: {
      effort: 1,
      toolingExists: false,
      notes: {
        de: "Es gibt nichts zu übernehmen, und das ist hier der Vorteil. Der eigentliche Gewinn ist, dienstliche Kommunikation aus privaten Konten herauszuholen — häufig der dringlichste Handlungsbedarf überhaupt.",
        en: "There is nothing to migrate, and here that is the advantage. The real gain is moving work communication out of private accounts — frequently the most urgent issue of all.",
      },
    },
    gotchas: ["gotcha.informal_channels_persist"],
    sources: ["https://matrix.org/docs/"],
  }),

  // --- Into wikis -----------------------------------------------------------
  edge({
    from: "confluence",
    to: "xwiki",
    complexityDelta: 0,
    dataMigration: {
      effort: 3,
      toolingExists: true,
      notes: {
        de: "Seiteninhalte lassen sich weitgehend übernehmen. Makros, eingebettete Diagramme und Verknüpfungen zu Vorgangssystemen erfordern Nacharbeit.",
        en: "Page content largely transfers. Macros, embedded diagrams and links to issue trackers require rework.",
      },
    },
    gotchas: ["gotcha.wiki_macros_do_not_transfer", "gotcha.attachment_links"],
    sources: ["https://www.xwiki.org/xwiki/bin/view/Documentation/"],
  }),
  edge({
    from: "shared-drive-documents",
    to: "bookstack",
    complexityDelta: -1,
    dataMigration: {
      effort: 2,
      toolingExists: false,
      notes: {
        de: "Eine Übernahme ist nur teilweise sinnvoll. Verstreute Dokumente werden beim Umstieg üblicherweise gesichtet und neu geschrieben — dieser inhaltliche Aufwand ist der eigentliche Posten, nicht die Technik.",
        en: "Only partial migration makes sense. Scattered documents are usually reviewed and rewritten during the move — that editorial effort is the real cost, not the technology.",
      },
    },
    gotchas: ["gotcha.content_needs_rewriting", "gotcha.no_clear_owner"],
    sources: ["https://www.bookstackapp.com/docs/"],
  }),

  // --- Into helpdesk --------------------------------------------------------
  edge({
    from: "shared-mailbox-helpdesk",
    to: "zammad",
    complexityDelta: 0,
    dataMigration: {
      effort: 2,
      toolingExists: true,
      notes: {
        de: "Der Umstieg vom Sammelpostfach ist meist ein Gewinn an Übersicht. Die eigentliche Arbeit liegt darin, Zuständigkeiten und Bearbeitungswege festzulegen — das ist eine organisatorische, keine technische Aufgabe.",
        en: "Moving off a shared mailbox usually gains clarity. The real work is defining responsibilities and handling paths — an organizational task, not a technical one.",
      },
    },
    gotchas: ["gotcha.process_must_be_defined_first", "gotcha.email_routing_changes"],
    sources: ["https://docs.zammad.org/"],
  }),
  edge({
    from: "jira-service-management",
    to: "zammad",
    complexityDelta: 1,
    dataMigration: {
      effort: 3,
      toolingExists: true,
      notes: {
        de: "Vorgänge lassen sich übernehmen. Aufwendig sind nachgebaute Automatisierungen und Auswertungen, die sich über Jahre angesammelt haben.",
        en: "Tickets can be carried over. The effort sits in reproducing automations and reports accumulated over years.",
      },
    },
    gotchas: [
      "gotcha.automations_need_rebuilding",
      "gotcha.reporting_definitions_differ",
    ],
    sources: ["https://docs.zammad.org/"],
  }),

  // --- Generic statements ---------------------------------------------------
  edge({
    from: "*",
    to: "openproject",
    complexityDelta: 0,
    dataMigration: {
      effort: 3,
      toolingExists: true,
      notes: {
        de: "Der Erfolg hängt weniger an der Datenübernahme als daran, ob tatsächlich nach Projekten gearbeitet wird. Wo das nicht der Fall ist, wirkt das System schwerfällig und wird umgangen.",
        en: "Success depends less on data migration than on whether work is genuinely organized in projects. Where it is not, the system feels heavy and gets bypassed.",
      },
    },
    gotchas: ["gotcha.tool_cannot_create_process"],
    sources: ["https://www.openproject.org/docs/"],
  }),
  edge({
    from: "*",
    to: "paperless-ngx",
    complexityDelta: 0,
    dataMigration: {
      effort: 3,
      toolingExists: true,
      notes: {
        de: "Der Bestand lässt sich schrittweise erfassen. Vor dem Start sind die Aufbewahrungspflichten zu klären, sonst wird eine Ablage aufgebaut, die den rechtlichen Anforderungen nicht genügt.",
        en: "The existing stock can be captured incrementally. Retention duties must be settled before starting, or you build a repository that does not meet legal requirements.",
      },
    },
    gotchas: [
      "gotcha.retention_rules_unclear",
      "gotcha.scanning_capacity_underestimated",
    ],
    sources: ["https://docs.paperless-ngx.com/"],
  }),
];
