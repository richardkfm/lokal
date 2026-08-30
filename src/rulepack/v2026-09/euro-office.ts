import type { BlockerRule, MigrationEdge, TargetTool } from "../schema";

/**
 * Euro-Office, added after v2026-08 was authored.
 *
 * It reached 1.0 on 2026-06-09: an AGPL-3.0 fork of the ONLYOFFICE open-source
 * codebase, with ONLYOFFICE's additional licence terms removed, governed by a
 * European consortium — IONOS, Nextcloud, EuroStack, XWiki, OpenProject,
 * Soverin, Abilian, bTactic, Office.EU and Open-Xchange. It attaches to a host
 * platform rather than standing alone, and ships inside Nextcloud as "Nextcloud
 * Office powered by Euro-Office".
 *
 * For a tool arguing European digital sovereignty to a German audience this is
 * the most on-thesis entry in the pack, which is exactly why its ratings are the
 * most conservative. `maturity: 2` is the load-bearing number: the suite is
 * months old, and the rulepack's own guidance is that an overstated
 * recommendation costs all of a plan's credibility rather than some of it.
 * A 1.0 release backed by well-known names is still a 1.0 release.
 *
 * The substantive criticism is recorded rather than dismissed: by targeting
 * Microsoft format compatibility as its headline feature, Euro-Office arguably
 * entrenches OOXML as the de-facto standard instead of strengthening ODF. That
 * is a real cost to a sovereignty argument, and the summary says so.
 */

const REVIEWED = "2026-08-30";

const SOURCES = [
  "https://github.com/Euro-Office/",
  "https://nextcloud.com/office/",
  "https://nextcloud.com/blog/press_releases/industry-initiative-launches-euro-office-as-true-sovereign-office-suite/",
];

export const euroOffice: TargetTool = {
  id: "euro-office",
  category: "office_docs",
  name: "Euro-Office",
  summary: {
    de: "Dokumentenbearbeitung im Browser, getragen von einem europäischen Konsortium (unter anderem Nextcloud, IONOS, XWiki, OpenProject). Technisch eine Abspaltung von ONLYOFFICE und entsprechend nah an den Microsoft-Formaten. Erste stabile Fassung im Juni 2026 — für den Produktivbetrieb jung.",
    en: "Browser-based document editing backed by a European consortium including Nextcloud, IONOS, XWiki and OpenProject. Technically a fork of ONLYOFFICE and correspondingly close to Microsoft formats. First stable release in June 2026 — young for production use.",
  },
  license: "agpl",
  // Nextcloud GmbH and IONOS SE lead the consortium; the summary names it as a
  // European consortium so this code is not read as a sole-vendor claim.
  vendorCountry: "DE",
  ecosystem: "nextcloud",
  hostingModes: ["self_hosted", "eu_managed"],
  sovereignty: 5,
  // A 1.0 from June 2026. Not a judgement on the code — a statement about how
  // much production history exists to judge it by.
  maturity: 2,
  supportModel: "commercial_available",
  // The Nextcloud and IONOS channels in Germany are large and real, but their
  // experience with this suite specifically is only months deep.
  deMarketPresence: 3,
  germanUiQuality: 4,
  publicSectorFit: 3,
  selfHostOpsLoad: 3,
  // Inherits ONLYOFFICE's format fidelity and familiar interface, which is the
  // whole point of the fork.
  migrationComplexityBase: 2,
  trainingLoad: 2,
  seatScalability: {
    comfortableUpTo: 1000,
    notes: {
      de: "Die Dimensionierung folgt dem ONLYOFFICE-Unterbau: maßgeblich ist die Zahl gleichzeitig bearbeiteter Dokumente, nicht die Zahl der Konten. Belastbare Erfahrungswerte aus großen Installationen fehlen für Euro-Office bislang.",
      en: "Sizing follows the ONLYOFFICE base: concurrent editing sessions matter, not account counts. Reliable large-installation experience specific to Euro-Office does not yet exist.",
    },
  },
  coexistence: "good",
  rollbackDifficulty: 2,
  aiSuitability: { hasNativeAi: false, localAiFriendly: 3 },
  prerequisites: ["file-platform"],
  lastReviewed: REVIEWED,
  reviewStatus: "draft",
  sources: SOURCES,
};

function edge(
  entry: Omit<MigrationEdge, "lastReviewed" | "reviewStatus">,
): MigrationEdge {
  return { ...entry, lastReviewed: REVIEWED, reviewStatus: "draft" };
}

export const euroOfficeEdges: MigrationEdge[] = [
  edge({
    from: "microsoft-365-apps",
    to: "euro-office",
    complexityDelta: 0,
    dataMigration: {
      effort: 2,
      toolingExists: true,
      notes: {
        de: "Die Dateien werden in den gewohnten Formaten weiterbearbeitet, sodass wenig Nacharbeit an Layouts anfällt. Makros und komplexe Excel-Modelle bleiben der Sonderfall, der einzeln geprüft werden muss.",
        en: "Files continue to be edited in their existing formats, so little layout rework is needed. Macros and complex Excel models remain the special case that needs individual review.",
      },
    },
    gotchas: ["gotcha.macro_heavy_spreadsheets"],
    sources: SOURCES,
  }),
  edge({
    from: "google-workspace-docs",
    to: "euro-office",
    complexityDelta: 1,
    dataMigration: {
      effort: 3,
      toolingExists: true,
      notes: {
        de: "Google-Dokumente müssen zunächst exportiert werden. Der Export ist vollständig, überträgt aber Kommentare, Versionsverläufe und Freigabelogik nur eingeschränkt.",
        en: "Google documents must be exported first. The export is complete but carries comments, version history and sharing logic across only partially.",
      },
    },
    gotchas: [],
    sources: SOURCES,
  }),
  edge({
    from: "ms-office-onprem",
    to: "euro-office",
    complexityDelta: 1,
    dataMigration: {
      effort: 2,
      toolingExists: true,
      notes: {
        de: "Der Wechsel ist weniger ein Datei- als ein Arbeitsplatzthema: Bearbeitung findet künftig im Browser statt. Wo bisher ohne Netz gearbeitet wurde, ist das eine spürbare Umstellung.",
        en: "The change is less about files than about the workstation: editing moves into the browser. Where people previously worked offline, that is a noticeable shift.",
      },
    },
    gotchas: [],
    sources: SOURCES,
  }),
];

/**
 * A suite this young should not be rolled out to every seat on the strength of a
 * fit score. The rule is a caution rather than a blocker: for an organization
 * that has decided sovereignty is the priority, being early is the point, and
 * lokal's job is to make the trade visible rather than to make it for them.
 */
export const euroOfficeCaution: BlockerRule = {
  id: "young-suite-needs-pilot",
  message: "blocker.young_release_pilot_first",
  severity: "caution",
  when: ({ entry, target }) =>
    target.maturity <= 2 && (entry.criticality === "high" || entry.seats >= 50),
};
