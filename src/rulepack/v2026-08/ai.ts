import type { AiDeployment, AiUseCase } from "../schema";

/**
 * The local-AI catalog.
 *
 * lokal advises on AI; it does not use AI. These entries describe what each use
 * case actually demands — hardware, data handling, human review — so the engine
 * can tell an organization which of its stated ambitions are realistic this year
 * and which are not, with a reason attached.
 *
 * `maxDataSensitivityByDeployment` is the important field. It says how sensitive
 * the data may be for a given deployment posture, which is what turns "we want an
 * AI assistant" into a concrete yes, pilot or not yet.
 */

const REVIEWED = "2026-08-12";

/**
 * Use-case entries describe lokal's own assessment framework rather than a
 * specific product, so they share a reference set: national guidance on the
 * secure use of AI, and the runtimes that determine what the hardware tiers
 * actually mean. Product-specific claims live in `aiDeployments`, which carry
 * their own sources.
 */
const USE_CASE_REFERENCES = ["https://www.bsi.bund.de/", "https://ollama.com/"];

function defineUseCase(
  entry: Omit<AiUseCase, "lastReviewed" | "reviewStatus" | "sources"> & {
    sources?: string[];
  },
): AiUseCase {
  return {
    sources: USE_CASE_REFERENCES,
    ...entry,
    lastReviewed: REVIEWED,
    reviewStatus: "draft",
  };
}

function defineDeployment(
  entry: Omit<AiDeployment, "lastReviewed" | "reviewStatus">,
): AiDeployment {
  return { ...entry, lastReviewed: REVIEWED, reviewStatus: "draft" };
}

export const aiUseCases: AiUseCase[] = [
  defineUseCase({
    id: "summarization",
    label: { de: "Zusammenfassungen", en: "Summarization" },
    description: {
      de: "Längere Texte, Protokolle oder Vorlagen auf das Wesentliche verkürzen. Der übliche Einstieg, weil das Ergebnis unmittelbar geprüft werden kann.",
      en: "Condensing longer texts, minutes or submissions. The usual entry point, because the result can be checked immediately.",
    },
    minHardware: "office_pcs",
    maxDataSensitivityByDeployment: {
      local_device: "high",
      on_prem: "high",
      eu_hosted: "medium",
    },
    humanReviewExpectation: "recommended",
    governanceNotes: {
      de: "Zusammenfassungen lassen Wesentliches weg — das ist ihr Zweck und zugleich ihr Risiko. Sie eignen sich zur Vorbereitung, nicht als Entscheidungsgrundlage ohne Blick in das Original.",
      en: "Summaries leave things out — that is their purpose and their risk. They suit preparation, not decisions taken without looking at the original.",
    },
    typicalValue: 4,
    requiresContentSource: false,
  }),
  defineUseCase({
    id: "drafting",
    label: { de: "Entwurfshilfe beim Schreiben", en: "Drafting assistance" },
    description: {
      de: "Erste Entwürfe für Schreiben, Vermerke oder Mitteilungen, die anschließend fachlich überarbeitet werden.",
      en: "First drafts of letters, notes or announcements that are then revised professionally.",
    },
    minHardware: "office_pcs",
    maxDataSensitivityByDeployment: {
      local_device: "high",
      on_prem: "high",
      eu_hosted: "medium",
    },
    humanReviewExpectation: "required",
    governanceNotes: {
      de: "Nach außen gerichtete Schreiben bleiben in der Verantwortung der verfassenden Stelle. Ein Entwurf ist ein Entwurf; die fachliche und rechtliche Prüfung ist nicht delegierbar.",
      en: "Outbound correspondence remains the responsibility of the issuing office. A draft is a draft; professional and legal review cannot be delegated.",
    },
    typicalValue: 4,
    requiresContentSource: false,
  }),
  defineUseCase({
    id: "ticket_triage",
    label: { de: "Vorsortierung von Anfragen", en: "Request triage" },
    description: {
      de: "Eingehende Anfragen nach Thema und Dringlichkeit vorsortieren und der zuständigen Stelle zuordnen.",
      en: "Pre-sorting incoming requests by topic and urgency and routing them to the responsible office.",
    },
    minHardware: "server",
    maxDataSensitivityByDeployment: {
      local_device: "medium",
      on_prem: "high",
      eu_hosted: "low",
    },
    humanReviewExpectation: "required",
    governanceNotes: {
      de: "Eine falsche Vorsortierung verzögert einzelne Anliegen, ohne dass es jemandem auffällt. Es braucht eine Rückfallregel für unsichere Fälle und eine regelmäßige Stichprobe.",
      en: "Wrong triage delays individual cases without anyone noticing. A fallback path for uncertain cases and regular sampling are needed.",
    },
    typicalValue: 3,
    requiresContentSource: false,
  }),
  defineUseCase({
    id: "document_qa",
    label: {
      de: "Fragen an eigene Dokumente",
      en: "Questions about your own documents",
    },
    description: {
      de: "Fragen zu vorhandenen Unterlagen stellen und Antworten mit Fundstellen erhalten. Setzt einen erschlossenen und durchsuchbaren Dokumentenbestand voraus.",
      en: "Asking questions about existing records and getting answers with references. Requires an indexed, searchable document base.",
    },
    minHardware: "server",
    maxDataSensitivityByDeployment: {
      local_device: "medium",
      on_prem: "high",
      eu_hosted: "low",
    },
    humanReviewExpectation: "required",
    governanceNotes: {
      de: "Ohne geordnete Rechtevergabe beantwortet ein solches System Fragen aus Unterlagen, die die fragende Person nicht sehen dürfte. Die Rechteprüfung muss vor der Einführung stehen, nicht danach.",
      en: "Without orderly permissions, such a system answers questions from records the asker should not see. Permission handling must come before rollout, not after.",
    },
    typicalValue: 5,
    requiresContentSource: true,
  }),
  defineUseCase({
    id: "knowledge_assistant",
    label: { de: "Interner Wissensassistent", en: "Internal knowledge assistant" },
    description: {
      de: "Ein durchgehend verfügbarer Assistent für Fragen zu internen Abläufen, Regelungen und Zuständigkeiten.",
      en: "A continuously available assistant for questions about internal processes, rules and responsibilities.",
    },
    minHardware: "gpu_capable",
    maxDataSensitivityByDeployment: {
      local_device: "low",
      on_prem: "high",
      eu_hosted: "low",
    },
    humanReviewExpectation: "required",
    governanceNotes: {
      de: "Der anspruchsvollste Anwendungsfall. Er verlangt gepflegte Inhalte, geklärte Zuständigkeiten und eine belastbare Rechtevergabe. Wo die Wissensablage bereits veraltet ist, verstärkt ein Assistent den Schaden, statt ihn zu beheben.",
      en: "The most demanding use case. It requires maintained content, clear ownership and dependable permissions. Where the knowledge base is already stale, an assistant amplifies the damage rather than fixing it.",
    },
    typicalValue: 4,
    requiresContentSource: true,
  }),
];

export const aiDeployments: AiDeployment[] = [
  defineDeployment({
    id: "on-device",
    label: { de: "Auf dem Arbeitsplatzrechner", en: "On the workstation" },
    description: {
      de: "Ein kleines Modell läuft unmittelbar auf dem Gerät. Die Daten verlassen den Arbeitsplatz nicht. Leistung und Qualität sind begrenzt, dafür ist der Einstieg denkbar einfach.",
      en: "A small model runs directly on the device. Data never leaves the workstation. Performance and quality are limited, but the barrier to entry is minimal.",
    },
    posture: "local_device",
    minHardware: "office_pcs",
    sovereignty: 5,
    opsLoad: 2,
    sources: ["https://ollama.com/", "https://github.com/ggml-org/llama.cpp"],
  }),
  defineDeployment({
    id: "on-premises-server",
    label: { de: "Auf einem eigenen Server", en: "On your own server" },
    description: {
      de: "Ein Modell läuft auf eigener Hardware im Haus. Die stärkste Kombination aus Datenhoheit und nutzbarer Qualität — verlangt jedoch geeignete Hardware und Betriebskenntnisse.",
      en: "A model runs on your own hardware on site. The strongest combination of data control and usable quality — but it requires suitable hardware and operational skill.",
    },
    posture: "on_prem",
    minHardware: "server",
    sovereignty: 5,
    opsLoad: 4,
    sources: ["https://docs.vllm.ai/", "https://ollama.com/"],
  }),
  defineDeployment({
    id: "eu-hosted-inference",
    label: { de: "Bei einem EU-Anbieter betrieben", en: "Run by an EU provider" },
    description: {
      de: "Das Modell wird bei einem Anbieter innerhalb der EU betrieben. Deutlich geringerer Betriebsaufwand, dafür verlässt der Inhalt das Haus — vertragliche Zusagen zur Datenverarbeitung sind hier entscheidend.",
      en: "The model runs at a provider inside the EU. Markedly lower operational effort, but content leaves the building — contractual commitments on data processing are decisive here.",
    },
    posture: "eu_hosted",
    minHardware: "none",
    sovereignty: 3,
    opsLoad: 1,
    sources: ["https://commission.europa.eu/law/law-topic/data-protection_en"],
  }),
];
