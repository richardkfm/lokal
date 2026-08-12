"use client";

import { useTranslations } from "next-intl";
import {
  AI_DEPLOYMENTS,
  AI_INTERESTS,
  AI_USE_CASE_IDS,
  CATEGORY_IDS,
  GERMAN_REGIONS,
  HARDWARE_PROFILES,
  HOSTING_PREFERENCES,
  LEVELS,
  LINUX_CAPABILITIES,
  ORG_TYPES,
  SUPPORT_EXPECTATIONS,
  URGENCIES,
  sizeBucketForSeats,
} from "@/domain/enums";
import {
  CheckboxCards,
  Fieldset,
  NumberField,
  RadioCards,
  TagField,
  TextField,
  Toggle,
} from "@/components/ui/field";
import type { CategoryId, Level } from "@/domain/enums";
import type { Draft, StepIssues } from "./state";

/**
 * The six wizard steps.
 *
 * Steps three and four are split deliberately. Choosing which categories are in
 * scope is fast and low-commitment; the per-category detail is where the user
 * invests real effort, and by then they have already decided to finish.
 */

type StepProps = {
  draft: Draft;
  update: (patch: (current: Draft) => Draft) => void;
  issues: StepIssues;
};

/** Builds choices from a vocabulary, labelled from the message catalog. */
function useChoices() {
  const t = useTranslations("vocabulary");

  return function choices(prefix: string, values: readonly string[], withHints = true) {
    return values.map((value) => {
      const hintKey = `${prefix}.${value}.hint`;
      const hint = withHints ? (t.has(hintKey) ? t(hintKey) : undefined) : undefined;
      return {
        value,
        label: t(`${prefix}.${value}.label`),
        ...(hint ? { hint } : {}),
      };
    });
  };
}

export function OrganizationStep({ draft, update, issues }: StepProps) {
  const t = useTranslations("wizard.organization");
  const choices = useChoices();
  const seats = draft.org.totalSeats;

  return (
    <div className="space-y-8">
      <Fieldset legend={t("typeLegend")} hint={t("typeHint")} error={issues.orgType}>
        <RadioCards
          name="orgType"
          value={draft.org.orgType}
          choices={choices("orgType", ORG_TYPES)}
          onChange={(value) =>
            update((d) => ({
              ...d,
              org: { ...d.org, orgType: value as Draft["org"]["orgType"] },
            }))
          }
        />
      </Fieldset>

      <Fieldset legend={t("sizeLegend")} hint={t("sizeHint")} error={issues.totalSeats}>
        <div className="space-y-3">
          <NumberField
            label={t("seatsLabel")}
            hint={t("seatsHint")}
            value={seats}
            onChange={(value) =>
              update((d) => ({ ...d, org: { ...d.org, totalSeats: value } }))
            }
            error={issues.totalSeats}
          />
          {seats && seats > 0 ? (
            <p className="text-faint text-xs">
              {t("derivedBucket", { bucket: sizeBucketForSeats(seats) })}
            </p>
          ) : null}
        </div>
      </Fieldset>

      <Fieldset legend={t("contextLegend")} hint={t("contextHint")}>
        <div className="space-y-3">
          <TagField
            label={t("departmentsLabel")}
            hint={t("departmentsHint")}
            values={draft.org.departments ?? []}
            onChange={(values) =>
              update((d) => ({ ...d, org: { ...d.org, departments: values } }))
            }
            placeholder={t("departmentsPlaceholder")}
          />

          <div className="grid gap-2 sm:grid-cols-2">
            <Toggle
              label={t("publicSectorLabel")}
              hint={t("publicSectorHint")}
              checked={draft.org.publicSector ?? false}
              onChange={(checked) =>
                update((d) => ({ ...d, org: { ...d.org, publicSector: checked } }))
              }
            />
            <Toggle
              label={t("germanLabel")}
              hint={t("germanHint")}
              checked={draft.org.germanLanguageRequired ?? true}
              onChange={(checked) =>
                update((d) => ({
                  ...d,
                  org: { ...d.org, germanLanguageRequired: checked },
                }))
              }
            />
          </div>

          <div>
            <label className="text-ink block text-sm font-medium" htmlFor="region">
              {t("regionLabel")}
            </label>
            <select
              id="region"
              value={draft.org.region ?? ""}
              onChange={(event) =>
                update((d) => ({
                  ...d,
                  org: {
                    ...d.org,
                    region: (event.target.value || undefined) as Draft["org"]["region"],
                  },
                }))
              }
              className="border-line bg-surface focus:border-brand focus:ring-brand mt-1.5 rounded-md border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
            >
              <option value="">{t("regionNone")}</option>
              {GERMAN_REGIONS.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Fieldset>
    </div>
  );
}

export function OperatingStep({ draft, update, issues }: StepProps) {
  const t = useTranslations("wizard.operating");
  const choices = useChoices();

  const set = (patch: Partial<Draft["operating"]>) =>
    update((d) => ({ ...d, operating: { ...d.operating, ...patch } }));

  return (
    <div className="space-y-8">
      <Fieldset
        legend={t("hostingLegend")}
        hint={t("hostingHint")}
        error={issues.hostingPreference}
      >
        <RadioCards
          name="hostingPreference"
          value={draft.operating.hostingPreference}
          choices={choices("hostingPreference", HOSTING_PREFERENCES)}
          onChange={(value) =>
            set({ hostingPreference: value as Draft["operating"]["hostingPreference"] })
          }
        />
      </Fieldset>

      <Fieldset
        legend={t("linuxLegend")}
        hint={t("linuxHint")}
        error={issues.linuxCapability}
      >
        <RadioCards
          name="linuxCapability"
          value={draft.operating.linuxCapability}
          choices={choices("linuxCapability", LINUX_CAPABILITIES)}
          onChange={(value) =>
            set({ linuxCapability: value as Draft["operating"]["linuxCapability"] })
          }
        />
      </Fieldset>

      <Fieldset legend={t("capacityLegend")} hint={t("capacityHint")}>
        <div className="space-y-4">
          {(
            [
              ["adminCapacity", issues.adminCapacity],
              ["itMaturity", issues.itMaturity],
              ["identityMaturity", issues.identityMaturity],
            ] as const
          ).map(([field, error]) => (
            <div key={field}>
              <p className="text-ink mb-1.5 text-sm font-medium">
                {t(`${field}Label`)}
              </p>
              <p className="text-muted mb-2 text-xs">{t(`${field}Hint`)}</p>
              <RadioCards
                name={field}
                value={draft.operating[field]}
                choices={choices(field, LEVELS)}
                onChange={(value) => set({ [field]: value as Level })}
              />
              {error ? (
                <p role="alert" className="mt-1 text-sm text-[var(--color-risk)]">
                  {error}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </Fieldset>

      <Fieldset
        legend={t("supportLegend")}
        hint={t("supportHint")}
        error={issues.supportExpectation}
      >
        <RadioCards
          name="supportExpectation"
          value={draft.operating.supportExpectation}
          choices={choices("supportExpectation", SUPPORT_EXPECTATIONS)}
          columns={2}
          onChange={(value) =>
            set({
              supportExpectation: value as Draft["operating"]["supportExpectation"],
            })
          }
        />
      </Fieldset>
    </div>
  );
}

export function StackStep({ draft, update, issues }: StepProps) {
  const t = useTranslations("wizard.stack");
  const choices = useChoices();

  return (
    <div className="space-y-6">
      <Fieldset legend={t("legend")} hint={t("hint")} error={issues._}>
        <CheckboxCards
          name="categories"
          values={draft.selectedCategories}
          choices={choices("category", CATEGORY_IDS)}
          onChange={(values) =>
            update((d) => ({
              ...d,
              // Preserve the vocabulary's order rather than click order, so the
              // detail step and the report read in the same sequence.
              selectedCategories: CATEGORY_IDS.filter((id) => values.includes(id)),
            }))
          }
        />
      </Fieldset>
      <p className="text-faint text-xs">{t("notAssessedNote")}</p>
    </div>
  );
}

export function DetailStep({ draft, update, issues }: StepProps) {
  const t = useTranslations("wizard.detail");
  const vocabulary = useTranslations("vocabulary");
  const choices = useChoices();

  const setEntry = (category: CategoryId, patch: Record<string, unknown>) =>
    update((d) => ({
      ...d,
      stack: { ...d.stack, [category]: { ...d.stack[category], ...patch } },
    }));

  if (draft.selectedCategories.length === 0) {
    return <p className="text-muted text-sm">{t("nothingSelected")}</p>;
  }

  return (
    <div className="space-y-10">
      <p className="text-muted text-sm leading-relaxed">{t("intro")}</p>

      {draft.selectedCategories.map((category, index) => {
        const entry = draft.stack[category] ?? {};
        const issueFor = (field: string) => issues[`${index}.${field}`];

        return (
          <section
            key={category}
            className="border-line bg-surface rounded-lg border p-5"
          >
            <h3 className="text-ink text-base font-semibold">
              {vocabulary(`category.${category}.label`)}
            </h3>

            <div className="mt-4 space-y-5">
              <TextField
                label={t("currentToolLabel")}
                hint={t("currentToolHint")}
                value={
                  entry.currentTool?.kind === "other" ? entry.currentTool.label : ""
                }
                onChange={(value) =>
                  setEntry(category, {
                    currentTool: value.trim()
                      ? { kind: "other", label: value }
                      : { kind: "none" },
                  })
                }
                placeholder={t("currentToolPlaceholder")}
              />

              <NumberField
                label={t("seatsLabel")}
                hint={t("seatsHint")}
                value={entry.seats}
                onChange={(value) => setEntry(category, { seats: value })}
                error={issueFor("seats")}
              />

              {(
                [
                  ["criticality", LEVELS],
                  ["pain", LEVELS],
                  ["lockInConcern", LEVELS],
                  ["trainingSensitivity", LEVELS],
                ] as const
              ).map(([field, values]) => (
                <div key={field}>
                  <p className="text-ink mb-1 text-sm font-medium">
                    {t(`${field}Label`)}
                  </p>
                  <p className="text-muted mb-2 text-xs">{t(`${field}Hint`)}</p>
                  <RadioCards
                    name={`${category}-${field}`}
                    value={entry[field]}
                    choices={choices(field, values)}
                    onChange={(value) => setEntry(category, { [field]: value })}
                  />
                  {issueFor(field) ? (
                    <p role="alert" className="mt-1 text-sm text-[var(--color-risk)]">
                      {issueFor(field)}
                    </p>
                  ) : null}
                </div>
              ))}

              <div>
                <p className="text-ink mb-1 text-sm font-medium">{t("urgencyLabel")}</p>
                <p className="text-muted mb-2 text-xs">{t("urgencyHint")}</p>
                <RadioCards
                  name={`${category}-urgency`}
                  value={entry.urgency}
                  choices={choices("urgency", URGENCIES)}
                  onChange={(value) => setEntry(category, { urgency: value })}
                />
                {issueFor("urgency") ? (
                  <p role="alert" className="mt-1 text-sm text-[var(--color-risk)]">
                    {issueFor("urgency")}
                  </p>
                ) : null}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function AiStep({ draft, update, issues }: StepProps) {
  const t = useTranslations("wizard.ai");
  const choices = useChoices();

  const set = (patch: Partial<Draft["ai"]>) =>
    update((d) => ({ ...d, ai: { ...d.ai, ...patch } }));

  return (
    <div className="space-y-8">
      <Fieldset
        legend={t("interestLegend")}
        hint={t("interestHint")}
        error={issues.interest}
      >
        <RadioCards
          name="aiInterest"
          value={draft.ai.interest}
          choices={choices("aiInterest", AI_INTERESTS)}
          onChange={(value) => set({ interest: value as Draft["ai"]["interest"] })}
        />
      </Fieldset>

      <Fieldset
        legend={t("sensitivityLegend")}
        hint={t("sensitivityHint")}
        error={issues.dataSensitivity}
      >
        <RadioCards
          name="dataSensitivity"
          value={draft.ai.dataSensitivity}
          choices={choices("dataSensitivity", LEVELS)}
          onChange={(value) => set({ dataSensitivity: value as Level })}
        />
      </Fieldset>

      <Fieldset
        legend={t("hardwareLegend")}
        hint={t("hardwareHint")}
        error={issues.hardwareProfile}
      >
        <RadioCards
          name="hardwareProfile"
          value={draft.ai.hardwareProfile}
          choices={choices("hardwareProfile", HARDWARE_PROFILES)}
          columns={2}
          onChange={(value) =>
            set({ hardwareProfile: value as Draft["ai"]["hardwareProfile"] })
          }
        />
      </Fieldset>

      <Fieldset
        legend={t("deploymentLegend")}
        hint={t("deploymentHint")}
        error={issues.deploymentPreference}
      >
        <RadioCards
          name="aiDeployment"
          value={draft.ai.deploymentPreference}
          choices={choices("aiDeployment", AI_DEPLOYMENTS)}
          columns={2}
          onChange={(value) =>
            set({ deploymentPreference: value as Draft["ai"]["deploymentPreference"] })
          }
        />
      </Fieldset>

      <Fieldset legend={t("useCasesLegend")} hint={t("useCasesHint")}>
        <CheckboxCards
          name="aiUseCases"
          values={draft.ai.useCases ?? []}
          choices={choices("aiUseCase", AI_USE_CASE_IDS)}
          onChange={(values) => set({ useCases: values as Draft["ai"]["useCases"] })}
        />
      </Fieldset>
    </div>
  );
}
