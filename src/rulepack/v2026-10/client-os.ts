import type { ClientOsGate, ClientOsLane, ClientOsRule, Prerequisite } from "../schema";

/**
 * The client operating system as a planning lane.
 *
 * Rules, not products. The lane answers whether the desktop can move, when, and
 * what blocks it. It never names a distribution — that is deferred (see
 * plans/roadmap.md) and there is nowhere in `ClientOsLane` to put one, because a
 * distribution recommendation derived from five intake answers would be exactly
 * the alternatives-finder output lokal exists not to produce.
 *
 * Sourced from the published post-mortems and audits of the German
 * public-sector desktop migrations, which is where the doctrine below comes
 * from. Every entry ships `draft`: authored from those documents, not yet
 * confirmed against a current release by a human.
 */

const LAST_REVIEWED = "2026-09-02";

/**
 * Sources for the lane as a whole.
 *
 * The Munich audit and the Schleswig-Holstein programme are the two documented
 * German cases at this scale, and they disagree about the outcome while
 * agreeing about the sequence — which is why the sequence, and not the outcome,
 * is what this lane encodes.
 */
const LANE_SOURCES = [
  "https://www.muenchen.de/rathaus/Stadtverwaltung/Direktorium/LiMux.html",
  "https://www.schleswig-holstein.de/DE/landesregierung/themen/digitalisierung/ocp/ocp_node.html",
  "https://www.bsi.bund.de/DE/Themen/Oeffentliche-Verwaltung/Digitale-Souveraenitaet/digitale-souveraenitaet_node.html",
];

/**
 * What has to be true before the desktop moves.
 *
 * Ordered as the work happens. `automatic` gates are decided from the
 * assessment; `manual` ones are work the organization does and confirms itself,
 * and the report presents them as open rather than ticking them off on the
 * reader's behalf — a checklist that marks itself complete is not a checklist.
 */
export const clientOsGates: ClientOsGate[] = [
  {
    id: "crossplatform-app-stack",
    label: {
      de: "Anwendungen laufen plattformübergreifend",
      en: "Applications run cross-platform",
    },
    description: {
      de: "Die täglich genutzten Anwendungen laufen im Browser oder als plattformübergreifende Programme, bevor das Betriebssystem gewechselt wird. Diese Reihenfolge ist der Kern des Vorgehens: wer zuerst das Betriebssystem tauscht, migriert Anwendungen und Arbeitsplätze gleichzeitig und muss bei jedem Problem beides zugleich rückgängig machen.",
      en: "The applications people use daily run in a browser or as cross-platform programs before the operating system changes. This order is the heart of the approach: swapping the operating system first means migrating applications and workstations at once, and unwinding both together whenever something goes wrong.",
    },
    kind: "automatic",
    lastReviewed: LAST_REVIEWED,
    reviewStatus: "draft",
    sources: LANE_SOURCES,
  },
  {
    id: "fachverfahren-inventory",
    label: {
      de: "Fachverfahren erfasst und bewertet",
      en: "Specialist applications inventoried and assessed",
    },
    description: {
      de: "Eine vollständige Liste der Windows-Programme, mit einer Entscheidung je Programm: ersetzen, über den Browser bereitstellen, auf getrennten Windows-Arbeitsplätzen belassen oder abschaffen. Ein gemischter Bestand ist ein zulässiges Ergebnis und kein Scheitern — unbekannte Abhängigkeiten dagegen sind der häufigste Grund, aus dem eine Umstellung mitten im Rollout abgebrochen wird.",
      en: "A complete list of the Windows programs, with a decision for each: replace it, deliver it through a browser, keep it on separate Windows workstations, or retire it. A mixed estate is a legitimate outcome and not a failure — unknown dependencies, by contrast, are the most common reason a rollout is abandoned halfway.",
    },
    kind: "automatic",
    lastReviewed: LAST_REVIEWED,
    reviewStatus: "draft",
    sources: LANE_SOURCES,
  },
  {
    id: "peripheral-inventory",
    label: {
      de: "Angeschlossene Geräte geprüft",
      en: "Attached devices verified",
    },
    description: {
      de: "Unterschriftenpads, Kartenlesegeräte, Etikettendrucker sowie Labor- und Maschinenschnittstellen sind auf dem neuen System tatsächlich erprobt — nicht anhand einer Herstellerangabe, sondern am Gerät. Treiberprobleme fallen sonst erst am Schalter auf.",
      en: "Signature pads, card readers, label printers and lab or machine interfaces have actually been tried on the new system — on the device, not on the strength of a vendor statement. Otherwise driver problems surface at the counter.",
    },
    kind: "manual",
    lastReviewed: LAST_REVIEWED,
    reviewStatus: "draft",
    sources: LANE_SOURCES,
  },
  {
    id: "endpoint-management",
    label: {
      de: "Softwareverteilung steht bereit",
      en: "Endpoint deployment in place",
    },
    description: {
      de: "Ein Weg, das neue System und seine Aktualisierungen auf die Geräte zu bringen, ohne jedes einzeln anzufassen. Ohne diesen Schritt wird aus dem Wechsel eine Handarbeit, deren Aufwand mit jedem Gerät linear wächst.",
      en: "A way to get the new system and its updates onto the devices without touching each one. Without it the change becomes manual work whose cost grows linearly with every device.",
    },
    kind: "automatic",
    lastReviewed: LAST_REVIEWED,
    reviewStatus: "draft",
    sources: LANE_SOURCES,
  },
  {
    id: "identity-independent-of-gpo",
    label: {
      de: "Benutzerverwaltung unabhängig von Gruppenrichtlinien",
      en: "User management independent of group policy",
    },
    description: {
      de: "Konten, Gruppen und Arbeitsplatzeinstellungen hängen nicht mehr an der Windows-Domäne. Solange die Konfiguration der Arbeitsplätze über Gruppenrichtlinien läuft, zieht ein Wechsel des Betriebssystems die Verzeichnisfrage zwingend mit sich — und die ist ein eigenes Vorhaben.",
      en: "Accounts, groups and workstation settings no longer depend on the Windows domain. As long as workstation configuration runs through group policy, changing the operating system necessarily drags the directory with it — and that is a project of its own.",
    },
    kind: "automatic",
    lastReviewed: LAST_REVIEWED,
    reviewStatus: "draft",
    sources: LANE_SOURCES,
  },
  {
    id: "pilot-through-a-full-cycle",
    label: {
      de: "Pilotgruppe über einen vollen Arbeitszyklus",
      en: "A pilot group through one full working cycle",
    },
    description: {
      de: "Eine echte Arbeitsgruppe arbeitet einen vollständigen Zyklus lang auf dem neuen System — bis zum Monatsabschluss, zur Abrechnung oder zum Stichtag, je nachdem, was den Takt vorgibt. Vieles fällt erst dann auf: der Druck der Jahresstatistik, das Makro in der Vorlage, der eine Vorgang im Quartal.",
      en: "A real working group spends one complete cycle on the new system — through month-end, payroll or whatever sets the rhythm. A good deal only shows up then: printing the annual statistics, the macro in the template, the one process that happens quarterly.",
    },
    kind: "manual",
    lastReviewed: LAST_REVIEWED,
    reviewStatus: "draft",
    sources: LANE_SOURCES,
  },
];

/**
 * Rules that block or qualify the lane.
 *
 * Windows-only applications are the only hard block, and deliberately so. Every
 * other obstacle here is work; this one is a dependency on somebody else's
 * product decision, which no amount of admin capacity resolves.
 */
export const clientOsRules: ClientOsRule[] = [
  {
    id: "windows-only-applications-dominate",
    message: "client_os.blocked_by_windows_only_applications",
    severity: "blocker",
    when: ({ input }) =>
      input.workplace.windowsOnlyApps === "many" ||
      input.workplace.windowsOnlyApps === "several",
  },
  {
    // Not a block: an unmapped estate is a reason to inventory it, and saying
    // "blockiert" here would let an organization conclude the answer is no when
    // the honest answer is "das weiß derzeit niemand".
    id: "windows-only-applications-unknown",
    message: "client_os.caution_no_application_inventory",
    severity: "caution",
    when: ({ input }) => input.workplace.windowsOnlyApps === "unknown",
  },
  {
    id: "peripherals-unverified",
    message: "client_os.blocked_pending_peripheral_check",
    severity: "blocker",
    when: ({ input }) => input.workplace.peripheralDependency === "high",
  },
  {
    id: "desktop-configuration-tied-to-the-domain",
    message: "client_os.caution_group_policy_ties_the_directory",
    severity: "caution",
    when: ({ input }) =>
      input.workplace.deviceManagement === "ad_gpo" &&
      input.operating.identityMaturity === "low",
  },
  {
    id: "no-way-to-reach-the-devices",
    message: "client_os.caution_no_endpoint_deployment",
    severity: "caution",
    when: ({ input }) => input.workplace.deviceManagement === "none",
  },
  {
    // The applications are the prerequisite, so a plan that moves nothing has
    // nothing for the desktop to follow.
    id: "no-applications-scheduled",
    message: "client_os.caution_no_application_migrations_planned",
    severity: "caution",
    when: ({ scheduledCategories }) => scheduledCategories.length === 0,
  },
];

/**
 * Extra groundwork this lane needs in phase 0.
 *
 * `endpoint-management` already exists in v2026-08 and is reused rather than
 * duplicated: it is the same piece of work whether it is carrying LibreOffice or
 * a whole operating system.
 */
export const clientOsPrerequisites: Prerequisite[] = [
  {
    id: "fachverfahren-inventory",
    label: {
      de: "Bestandsaufnahme der Fachverfahren",
      en: "Inventory of specialist applications",
    },
    description: {
      de: "Eine vollständige Liste der Windows-Programme mit Zuständigkeit, Vertrag und Ablösemöglichkeit. Bis diese Liste existiert, ist jede Aussage über den Wechsel des Betriebssystems eine Vermutung.",
      en: "A complete list of the Windows programs with their owner, contract and replaceability. Until that list exists, any statement about changing the operating system is a guess.",
    },
    kind: "process",
    effort: 4,
  },
  {
    id: "peripheral-inventory",
    label: {
      de: "Prüfung der angeschlossenen Geräte",
      en: "Verification of attached devices",
    },
    description: {
      de: "Jede Geräteart einmal am neuen System erprobt und das Ergebnis festgehalten. Am Gerät, nicht am Datenblatt.",
      en: "Each kind of device tried once on the new system, with the result written down. On the device, not from the data sheet.",
    },
    kind: "process",
    effort: 2,
  },
];

export const clientOsLane: ClientOsLane = {
  movesAfterApplications: true,
  gates: clientOsGates,
  rules: clientOsRules,
  /**
   * Per device, and per device on purpose.
   *
   * Unlike an application migration this one scales with machines almost
   * linearly, so a band would hide the number that actually drives the estimate.
   * The range is wide because it spans a reinstall on uniform hardware and a
   * machine-by-machine visit with data carried across.
   */
  daysPerDevice: { min: 0.05, max: 0.2 },
  /**
   * Fixed preparation regardless of estate size: the image, the deployment
   * path, the peripheral tests, the rollback plan.
   */
  fixedDays: { min: 10, max: 25 },
  lastReviewed: LAST_REVIEWED,
  reviewStatus: "draft",
  sources: LANE_SOURCES,
};
