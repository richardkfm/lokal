"use client";

import { useState } from "react";
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
}: {
  current: StepId;
  onSelect: (index: number) => void;
  labels: Record<StepId, string>;
}) {
  return (
    <nav aria-label="Fortschritt" className="mb-8">
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
}: {
  draft: Draft;
  onEdit: (index: number) => void;
}) {
  const t = useTranslations("wizard.review");
  const vocabulary = useTranslations("vocabulary");
  const warnings = dataQualityWarnings(draft, t as never);

  const rows: Array<{ label: string; value: string; step: number }> = [
    {
      label: t("orgType"),
      value: draft.org.orgType ? vocabulary(`orgType.${draft.org.orgType}.label`) : "—",
      step: 0,
    },
    {
      label: t("seats"),
      value: draft.org.totalSeats
        ? `${draft.org.totalSeats} (${sizeBucketForSeats(draft.org.totalSeats)})`
        : "—",
      step: 0,
    },
    {
      label: t("departments"),
      value: draft.org.departments?.length ? draft.org.departments.join(", ") : "—",
      step: 0,
    },
    {
      label: t("hosting"),
      value: draft.operating.hostingPreference
        ? vocabulary(`hostingPreference.${draft.operating.hostingPreference}.label`)
        : "—",
      step: 1,
    },
    {
      label: t("categories"),
      value: draft.selectedCategories.length
        ? draft.selectedCategories
            .map((category) => vocabulary(`category.${category}.label`))
            .join(", ")
        : "—",
      step: 2,
    },
    {
      label: t("aiInterest"),
      value: draft.ai.interest
        ? vocabulary(`aiInterest.${draft.ai.interest}.label`)
        : "—",
      step: 4,
    },
  ];

  return (
    <div className="space-y-6">
      <p className="text-muted text-sm leading-relaxed">{t("intro")}</p>

      <dl className="border-line divide-line divide-y border-t border-b">
        {rows.map((row) => (
          <div key={row.label} className="flex gap-4 py-3 text-sm">
            <dt className="text-muted w-44 shrink-0">{row.label}</dt>
            <dd className="text-ink flex-1">{row.value}</dd>
            <button
              type="button"
              onClick={() => onEdit(row.step)}
              className="text-brand shrink-0 text-xs underline underline-offset-2"
            >
              {t("edit")}
            </button>
          </div>
        ))}
      </dl>

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

function WizardForm() {
  const t = useTranslations("wizard");
  const locale = useLocale() as "de" | "en";
  const router = useRouter();
  const wizard = useWizard();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const labels = Object.fromEntries(
    STEPS.map((step) => [step, t(`steps.${step}`)]),
  ) as Record<StepId, string>;

  const isReview = wizard.step === "review";
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
      <Stepper current={wizard.step} onSelect={wizard.setStepIndex} labels={labels} />

      <h2 className="text-ink text-xl font-semibold tracking-tight">
        {t(`headings.${wizard.step}`)}
      </h2>
      <p className="text-muted mt-2 mb-8 text-sm leading-relaxed">
        {t(`descriptions.${wizard.step}`)}
      </p>

      {wizard.step === "organization" ? <OrganizationStep {...stepProps} /> : null}
      {wizard.step === "operating" ? <OperatingStep {...stepProps} /> : null}
      {wizard.step === "stack" ? <StackStep {...stepProps} /> : null}
      {wizard.step === "detail" ? <DetailStep {...stepProps} /> : null}
      {wizard.step === "ai" ? <AiStep {...stepProps} /> : null}
      {isReview ? (
        <ReviewStep draft={wizard.draft} onEdit={wizard.setStepIndex} />
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

        {!wizard.canAdvance && !isReview ? (
          <p className="text-muted text-xs">{t("completeStep")}</p>
        ) : null}

        <button
          type="button"
          onClick={wizard.clear}
          className="text-faint hover:text-ink ml-auto text-xs underline underline-offset-2"
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
export function Wizard() {
  const t = useTranslations("wizard");
  const hydrated = useHydrated();

  if (!hydrated) {
    return <div className="text-faint py-16 text-sm">{t("loading")}</div>;
  }

  return <WizardForm />;
}
