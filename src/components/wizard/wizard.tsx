"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { sizeBucketForSeats } from "@/domain/enums";
import {
  AiStep,
  DetailStep,
  OperatingStep,
  OrganizationStep,
  StackStep,
} from "./steps";
import type { SourceToolOptions } from "@/lib/source-tool-options";
import {
  STEPS,
  toAssessment,
  useHydrated,
  useWizard,
  type Draft,
  type StepId,
} from "./state";

/**
 * The intake wizard.
 *
 * Runs entirely in the browser and posts once, at the end. The stepper is
 * navigable backwards at any time, and answers survive a refresh, because
 * fifteen minutes of work should not depend on not touching the reload button.
 */

/**
 * Schema field to the label the form actually shows for it.
 *
 * Explicit rather than derived, because the two vocabularies genuinely differ:
 * the schema says `orgType` and `totalSeats` where the form says "Art der
 * Organisation" and "Arbeitsplätze insgesamt", and a summary that says
 * "orgType: Bitte eine Option auswählen" is no more use than the two adjacent
 * "Pflichtfeld." messages it replaced. Detail-step keys are positional
 * (`0.criticality`) and handled separately.
 */
const ISSUE_LABELS: Partial<Record<StepId, Record<string, string>>> = {
  organization: {
    orgType: "organization.typeLegend",
    totalSeats: "organization.seatsLabel",
    departments: "organization.departmentsLabel",
    publicSector: "organization.publicSectorLabel",
    region: "organization.regionLabel",
    germanLanguageRequired: "organization.germanLabel",
  },
  operating: {
    hostingPreference: "operating.hostingLegend",
    linuxCapability: "operating.linuxLegend",
    adminCapacity: "operating.adminCapacityLabel",
    itMaturity: "operating.itMaturityLabel",
    identityMaturity: "operating.identityMaturityLabel",
    supportExpectation: "operating.supportLegend",
    clientOs: "operating.clientOsLegend",
    windowsOnlyApps: "operating.windowsOnlyLegend",
    deviceManagement: "operating.deviceManagementLegend",
    peripheralDependency: "operating.peripheralLabel",
    deviceCount: "operating.deviceCountLabel",
    internalDayRateCents: "operating.internalRateLabel",
    externalDayRateCents: "operating.externalRateLabel",
  },
  ai: {
    interest: "ai.interestLegend",
    dataSensitivity: "ai.sensitivityLegend",
    deploymentPreference: "ai.deploymentLegend",
    hardwareProfile: "ai.hardwareLegend",
    useCases: "ai.useCasesLegend",
  },
};

const STEP_ORDER: Record<StepId, number> = {
  organization: 1,
  operating: 2,
  stack: 3,
  detail: 4,
  ai: 5,
  review: 6,
};

function Stepper({
  current,
  onSelect,
  labels,
  progressLabel,
}: {
  current: StepId;
  onSelect: (index: number) => void;
  labels: Record<StepId, string>;
  progressLabel: string;
}) {
  return (
    <nav aria-label={progressLabel} className="mb-8">
      <ol className="flex flex-wrap gap-x-1 gap-y-2 text-xs">
        {STEPS.map((step, index) => {
          const isCurrent = step === current;
          const isPast = STEP_ORDER[step] < STEP_ORDER[current];

          return (
            <li key={step}>
              <button
                type="button"
                onClick={() => onSelect(index)}
                aria-current={isCurrent ? "step" : undefined}
                className={[
                  "rounded-full px-3 py-1.5 transition-colors",
                  isCurrent
                    ? "bg-brand font-medium text-white"
                    : isPast
                      ? "bg-sunken text-ink hover:bg-[var(--color-brand-soft)]"
                      : "text-faint",
                ].join(" ")}
              >
                <span className="tabular mr-1.5">{STEP_ORDER[step]}</span>
                {labels[step]}
              </button>
            </li>
          );
        })}
      </ol>

      {/* Progress as one continuous line rather than six separate pills.
          The pills wrap on a narrow screen and stop reading as a sequence; this
          does not. Decorative — `aria-current` on the buttons above is what
          actually announces position. */}
      <div className="path-rail path-rail-h mt-4" aria-hidden="true">
        <div
          className="bg-brand absolute inset-y-0 left-0"
          style={{ width: `${(STEP_ORDER[current] / STEPS.length) * 100}%` }}
        />
        <span className="path-dot" />
      </div>
    </nav>
  );
}

/** Warnings that are worth raising but must not block submission. */
function dataQualityWarnings(draft: Draft, t: (key: string, values?: never) => string) {
  const warnings: string[] = [];
  const total = draft.org.totalSeats ?? 0;

  for (const category of draft.selectedCategories) {
    const seats = draft.stack[category]?.seats ?? 0;
    if (total > 0 && seats > total * 1.2) {
      warnings.push(t("warnSeatsExceedOrg"));
      break;
    }
  }

  if (total > 50 && (draft.org.departments?.length ?? 0) === 0) {
    warnings.push(t("warnNoDepartments"));
  }

  if (draft.ai.interest !== "none" && (draft.ai.useCases?.length ?? 0) === 0) {
    warnings.push(t("warnNoAiUseCases"));
  }

  return warnings;
}

function ReviewStep({
  draft,
  onEdit,
  tools,
}: {
  draft: Draft;
  onEdit: (index: number) => void;
  tools: SourceToolOptions;
}) {
  const t = useTranslations("wizard.review");
  const w = useTranslations("wizard");
  const vocabulary = useTranslations("vocabulary");
  const locale = useLocale();
  const warnings = dataQualityWarnings(draft, t as never);

  const dash = "—";
  const label = (namespace: string, key: string) =>
    w.has(`${namespace}.${key}Label` as never)
      ? w(`${namespace}.${key}Label` as never)
      : w.has(`${namespace}.${key}Legend` as never)
        ? w(`${namespace}.${key}Legend` as never)
        : key;
  const term = (vocab: string, value: string | undefined) =>
    value ? vocabulary(`${vocab}.${value}.label` as never) : dash;

  /**
   * A declared day rate, or the sentence saying what leaving it empty means.
   *
   * "—" would read as an oversight to correct. The absence is deliberate and
   * has a consequence the respondent should see before submitting: no rate, no
   * cost figure in the report (ADR-0004).
   */
  const formatRate = (cents: number | undefined) =>
    cents === undefined
      ? t("noRateDeclared")
      : new Intl.NumberFormat(locale, {
          style: "currency",
          currency: "EUR",
          maximumFractionDigits: 0,
        }).format(cents / 100);

  /**
   * Every answer, grouped by the step that asked for it.
   *
   * This step showed six rows out of roughly thirty-five, under copy reading
   * "Ihre Angaben in Kurzform. Der Plan wird ausschließlich hieraus berechnet."
   * — which was not true of what it displayed. None of the per-area ratings
   * appeared, and neither did the four capacity answers that decide whether the
   * plan is achievable at all. A review step that shows a sixth of the answers
   * is not a review; it is a receipt for a form the respondent cannot check.
   */
  const groups: Array<{
    title: string;
    step: number;
    rows: Array<{ label: string; value: string }>;
  }> = [
    {
      title: w("steps.organization"),
      step: 0,
      rows: [
        { label: t("orgType"), value: term("orgType", draft.org.orgType) },
        {
          label: t("seats"),
          value: draft.org.totalSeats
            ? `${draft.org.totalSeats} (${sizeBucketForSeats(draft.org.totalSeats)})`
            : dash,
        },
        {
          label: t("departments"),
          value: draft.org.departments?.length
            ? draft.org.departments.join(", ")
            : dash,
        },
        {
          label: label("organization", "publicSector"),
          value: t(draft.org.publicSector ? "yes" : "no"),
        },
      ],
    },
    {
      title: w("steps.operating"),
      step: 1,
      rows: [
        {
          label: t("hosting"),
          value: term("hostingPreference", draft.operating.hostingPreference),
        },
        {
          label: label("operating", "linux"),
          value: term("linuxCapability", draft.operating.linuxCapability),
        },
        {
          label: label("operating", "adminCapacity"),
          value: term("adminCapacity", draft.operating.adminCapacity),
        },
        {
          label: label("operating", "itMaturity"),
          value: term("itMaturity", draft.operating.itMaturity),
        },
        {
          label: label("operating", "identityMaturity"),
          value: term("identityMaturity", draft.operating.identityMaturity),
        },
        {
          label: label("operating", "support"),
          value: term("supportExpectation", draft.operating.supportExpectation),
        },
        {
          label: label("operating", "clientOs"),
          value: term("clientOs", draft.workplace.clientOs),
        },
        {
          label: label("operating", "windowsOnly"),
          value: term("windowsOnlyApps", draft.workplace.windowsOnlyApps),
        },
        {
          label: label("operating", "deviceManagement"),
          value: term("deviceManagement", draft.workplace.deviceManagement),
        },
        {
          label: label("operating", "peripheral"),
          value: term("peripheralDependency", draft.workplace.peripheralDependency),
        },
        {
          label: label("operating", "deviceCount"),
          // An absent device count is a real answer, not a gap: the plan falls
          // back to seats and says so.
          value: draft.workplace.deviceCount
            ? String(draft.workplace.deviceCount)
            : t("notStated"),
        },
        {
          label: label("operating", "internalRate"),
          value: formatRate(draft.rates.internalDayRateCents),
        },
        {
          label: label("operating", "externalRate"),
          value: formatRate(draft.rates.externalDayRateCents),
        },
      ],
    },
    {
      title: w("steps.stack"),
      step: 2,
      rows: [
        {
          label: t("categories"),
          value: draft.selectedCategories.length
            ? draft.selectedCategories
                .map((category) => vocabulary(`category.${category}.label`))
                .join(", ")
            : dash,
        },
      ],
    },
    ...draft.selectedCategories.map((category) => {
      const entry = draft.stack[category] ?? {};
      // By name, never by id. A review step that says "microsoft-365-apps"
      // where the form said "Microsoft 365 (Word, Excel, PowerPoint)" is asking
      // the respondent to check something they were never shown.
      const chosen = entry.currentTool;
      const currentTool =
        chosen?.kind === "known"
          ? ((tools[category] ?? []).find((tool) => tool.id === chosen.id)?.name ??
            chosen.id)
          : chosen?.kind === "other"
            ? chosen.label
            : w("detail.currentToolNone");

      return {
        title: `${w("steps.detail")}: ${vocabulary(`category.${category}.label`)}`,
        step: 3,
        rows: [
          { label: w("detail.currentToolLabel"), value: currentTool },
          {
            label: w("detail.seatsLabel"),
            value: String(entry.seats ?? draft.org.totalSeats ?? dash),
          },
          {
            label: w("detail.criticalityLabel"),
            value: term("criticality", entry.criticality),
          },
          { label: w("detail.painLabel"), value: term("pain", entry.pain) },
          {
            label: w("detail.lockInConcernLabel"),
            value: term("lockInConcern", entry.lockInConcern),
          },
          {
            label: w("detail.trainingSensitivityLabel"),
            value: term("trainingSensitivity", entry.trainingSensitivity),
          },
          { label: w("detail.urgencyLabel"), value: term("urgency", entry.urgency) },
        ],
      };
    }),
    {
      title: w("steps.ai"),
      step: 4,
      rows: [
        { label: t("aiInterest"), value: term("aiInterest", draft.ai.interest) },
        {
          label: label("ai", "sensitivity"),
          value: term("dataSensitivity", draft.ai.dataSensitivity),
        },
        {
          label: label("ai", "deployment"),
          value: term("aiDeployment", draft.ai.deploymentPreference),
        },
        {
          label: label("ai", "hardware"),
          value: term("hardwareProfile", draft.ai.hardwareProfile),
        },
        {
          label: label("ai", "useCases"),
          value: draft.ai.useCases?.length
            ? draft.ai.useCases
                .map((useCase) => vocabulary(`aiUseCase.${useCase}.label` as never))
                .join(", ")
            : dash,
        },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <p className="text-muted text-sm leading-relaxed">{t("intro")}</p>

      {groups.map((group) => (
        <details key={group.title} open className="border-line rounded-md border">
          <summary className="text-ink flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm font-medium">
            {group.title}
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                onEdit(group.step);
              }}
              className="text-brand ml-auto text-xs underline underline-offset-2"
            >
              {t("edit")}
            </button>
          </summary>
          <dl className="border-line divide-line divide-y border-t">
            {group.rows.map((row) => (
              <div key={row.label} className="flex gap-4 px-4 py-2.5 text-sm">
                <dt className="text-muted w-56 shrink-0">{row.label}</dt>
                <dd className="text-ink flex-1">{row.value}</dd>
              </div>
            ))}
          </dl>
        </details>
      ))}

      {warnings.length > 0 ? (
        <div className="rounded-md border border-[var(--color-caution)] bg-[var(--color-caution-soft)] p-4">
          <p className="text-ink text-sm font-medium">{t("warningsTitle")}</p>
          <ul className="text-muted mt-2 list-disc space-y-1 pl-5 text-sm">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
          <p className="text-faint mt-2 text-xs">{t("warningsNote")}</p>
        </div>
      ) : null}
    </div>
  );
}

function WizardForm({ tools }: { tools: SourceToolOptions }) {
  const t = useTranslations("wizard");
  const v = useTranslations("vocabulary");
  const locale = useLocale() as "de" | "en";
  const router = useRouter();
  const wizard = useWizard();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const labels = Object.fromEntries(
    STEPS.map((step) => [step, t(`steps.${step}`)]),
  ) as Record<StepId, string>;

  const isReview = wizard.step === "review";

  /**
   * What is still open, named.
   *
   * Clicking "Weiter" on an incomplete step used to do nothing a person could
   * see: focus stayed on the button, the page did not scroll, and the first
   * error could be seven hundred pixels above. Two adjacent fields both read
   * "Pflichtfeld." with nothing saying which field. An error summary that takes
   * focus is the standard pattern for an accessible German form, and it is what
   * a BITV-audited Behördenformular does.
   */
  const issueEntries = Object.entries(wizard.issues).filter(([key]) => key !== "_");
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (wizard.blocked) summaryRef.current?.focus();
  }, [wizard.blocked]);

  function issueLabel(key: string): string {
    const [head, field] = key.split(".");

    // Detail issues are keyed by position in the selected-category list, so the
    // label has to name the area as well as the question.
    if (field !== undefined) {
      const category = wizard.draft.selectedCategories[Number(head)];
      const area = category ? v(`category.${category}.label` as never) : "";
      const question = t.has(`detail.${field}Label` as never)
        ? t(`detail.${field}Label` as never)
        : field;
      return area ? `${area} — ${question}` : question;
    }

    const message = ISSUE_LABELS[wizard.step]?.[key];
    return message ? t(message as never) : key;
  }
  const payload = isReview ? toAssessment(wizard.draft, locale) : null;

  async function submit() {
    if (!payload) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/assessments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setSubmitError(t("submitFailed"));
        return;
      }

      const { id } = (await response.json()) as { id: string };
      wizard.clear();
      router.push(`/report/${id}`);
    } catch {
      setSubmitError(t("submitFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  const stepProps = {
    draft: wizard.draft,
    update: wizard.update,
    issues: wizard.issues,
  };

  return (
    <div>
      <Stepper
        current={wizard.step}
        onSelect={wizard.setStepIndex}
        labels={labels}
        progressLabel={t("progressLabel")}
      />

      <h2 className="text-ink text-xl font-semibold tracking-tight">
        {t(`headings.${wizard.step}`)}
      </h2>
      <p className="text-muted mt-2 mb-8 text-sm leading-relaxed">
        {t(`descriptions.${wizard.step}`)}
      </p>

      {wizard.blocked ? (
        <div
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          className="mb-8 rounded-md border border-[var(--color-risk)] bg-[var(--color-risk-soft)] p-4 focus:outline-none"
        >
          <p className="text-ink text-sm font-medium">{t("errorSummaryTitle")}</p>
          <ul className="text-ink mt-2 list-disc space-y-1 pl-5 text-sm">
            {issueEntries.map(([key, message]) => (
              <li key={key}>
                <span className="font-medium">{issueLabel(key)}</span>
                {": "}
                {message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {wizard.step === "organization" ? <OrganizationStep {...stepProps} /> : null}
      {wizard.step === "operating" ? <OperatingStep {...stepProps} /> : null}
      {wizard.step === "stack" ? <StackStep {...stepProps} /> : null}
      {wizard.step === "detail" ? <DetailStep {...stepProps} tools={tools} /> : null}
      {wizard.step === "ai" ? <AiStep {...stepProps} /> : null}
      {isReview ? (
        <ReviewStep draft={wizard.draft} onEdit={wizard.setStepIndex} tools={tools} />
      ) : null}

      {submitError ? (
        <p role="alert" className="mt-6 text-sm text-[var(--color-risk)]">
          {submitError}
        </p>
      ) : null}

      <div className="border-line mt-10 flex items-center gap-3 border-t pt-6">
        <button
          type="button"
          onClick={wizard.back}
          disabled={wizard.stepIndex === 0}
          className="border-line text-ink hover:bg-sunken rounded-md border px-4 py-2 text-sm disabled:opacity-40"
        >
          {t("back")}
        </button>

        {isReview ? (
          <button
            type="button"
            onClick={submit}
            disabled={!payload || submitting}
            className="bg-brand hover:bg-brand-strong rounded-md px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? t("submitting") : t("submit")}
          </button>
        ) : (
          <button
            type="button"
            onClick={wizard.next}
            className="bg-brand hover:bg-brand-strong rounded-md px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {t("next")}
          </button>
        )}

        {/* Only after an attempt. This used to show the moment a step appeared,
            before the user had done anything, which teaches people to ignore
            it. */}
        {wizard.blocked ? (
          <p className="text-muted text-xs">{t("completeStep")}</p>
        ) : null}

        {/* Fifteen minutes of answers, one click away from gone. The confirm is
            the whole safeguard; the padding gets it to the 24px WCAG 2.5.8
            target minimum, which a 16px-tall link does not meet. */}
        <button
          type="button"
          onClick={() => {
            if (window.confirm(t("startOverConfirm"))) wizard.clear();
          }}
          className="text-faint hover:text-ink ml-auto px-2 py-1.5 text-xs underline underline-offset-2"
        >
          {t("startOver")}
        </button>
      </div>
    </div>
  );
}

/**
 * Gates the form on hydration.
 *
 * The saved draft is read straight into initial state, which is only safe once
 * the client has taken over — the server has no localStorage, and rendering
 * empty fields over answers the user already gave would be worse than a brief
 * placeholder.
 */
export function Wizard({ tools }: { tools: SourceToolOptions }) {
  const t = useTranslations("wizard");
  const hydrated = useHydrated();

  if (!hydrated) {
    return <div className="text-faint py-16 text-sm">{t("loading")}</div>;
  }

  return <WizardForm tools={tools} />;
}
