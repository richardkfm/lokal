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
  RadioGroup,
  SelectField,
  TagField,
  TextField,
  Toggle,
} from "@/components/ui/field";
import type { CategoryId, Level } from "@/domain/enums";
import type { SourceToolOptions } from "@/lib/source-tool-options";
import { stackEntrySchema } from "@/domain/intake";
import { copyEntryValues, selectCategories } from "./state";
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
            <RadioGroup
              key={field}
              legend={t(`${field}Label`)}
              hint={t(`${field}Hint`)}
              error={error}
              name={field}
              value={draft.operating[field]}
              choices={choices(field, LEVELS)}
              onChange={(value) => set({ [field]: value as Level })}
            />
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
          // Preserves the vocabulary's order rather than click order, so the
          // detail step and the report read in the same sequence, and seeds a
          // neutral starting rating for any newly checked category.
          onChange={(values) => update((d) => selectCategories(d, values))}
        />
      </Fieldset>
      <p className="text-faint text-xs">{t("notAssessedNote")}</p>
    </div>
  );
}

/**
 * Sentinel select values.
 *
 * Namespaced so they cannot collide with a rulepack tool id, which is what they
 * share an option list with.
 */
const TOOL_NONE = "__none__";
const TOOL_OTHER = "__other__";

export function DetailStep({
  draft,
  update,
  issues,
  tools,
}: StepProps & { tools: SourceToolOptions }) {
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

  const firstCategory = draft.selectedCategories[0]!;
  const completedCount = draft.selectedCategories.filter(
    (category) =>
      stackEntrySchema.safeParse({
        currentTool: { kind: "none" },
        seats: draft.org.totalSeats,
        ...draft.stack[category],
        category,
      }).success,
  ).length;

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <p className="text-muted text-sm leading-relaxed">{t("intro")}</p>
        <p className="text-faint text-xs">{t("keyboardHint")}</p>
        <p className="text-faint text-xs">
          {t("progress", {
            done: completedCount,
            total: draft.selectedCategories.length,
          })}
        </p>
        {draft.selectedCategories.length > 1 ? (
          <button
            type="button"
            onClick={() =>
              update((d) => {
                const patch = copyEntryValues(d.stack[firstCategory]);
                const stack = { ...d.stack };
                for (const category of d.selectedCategories.slice(1)) {
                  stack[category] = { ...stack[category], ...patch };
                }
                return { ...d, stack };
              })
            }
            className="text-brand text-xs underline underline-offset-2"
          >
            {t("applyToAllLabel")}
          </button>
        ) : null}
      </div>

      {draft.selectedCategories.map((category, index) => {
        const entry = draft.stack[category] ?? {};
        const issueFor = (field: string) => issues[`${index}.${field}`];

        return (
          <section
            key={category}
            // Named so the category blocks become navigable landmarks: with
            // nine categories in scope this step is the longest page in the
            // wizard, and jumping between them beats scrolling past every field.
            aria-labelledby={`detail-${category}`}
            className="border-line bg-surface rounded-lg border p-5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3
                id={`detail-${category}`}
                className="text-ink text-base font-semibold"
              >
                {vocabulary(`category.${category}.label`)}
              </h3>
              {index > 0 ? (
                <button
                  type="button"
                  onClick={() =>
                    setEntry(category, copyEntryValues(draft.stack[firstCategory]))
                  }
                  className="text-brand text-xs underline underline-offset-2"
                >
                  {t("copyFromFirstLabel", {
                    category: vocabulary(`category.${firstCategory}.label`),
                  })}
                </button>
              ) : null}
            </div>

            <div className="mt-4 space-y-5">
              <SelectField
                label={t("currentToolLabel")}
                hint={t("currentToolHint")}
                value={
                  entry.currentTool?.kind === "known"
                    ? entry.currentTool.id
                    : entry.currentTool?.kind === "other"
                      ? TOOL_OTHER
                      : TOOL_NONE
                }
                onChange={(value) =>
                  setEntry(category, {
                    currentTool:
                      value === TOOL_NONE
                        ? { kind: "none" }
                        : value === TOOL_OTHER
                          ? // Kept as free text with an empty label until the
                            // field below is filled, so choosing "something
                            // else" never silently records a nameless system.
                            { kind: "other", label: "" }
                          : { kind: "known", id: value },
                  })
                }
                options={[
                  { value: TOOL_NONE, label: t("currentToolNone") },
                  ...(tools[category] ?? []).map((tool) => ({
                    value: tool.id,
                    label: tool.name,
                  })),
                  { value: TOOL_OTHER, label: t("currentToolOther") },
                ]}
              />

              {entry.currentTool?.kind === "other" ? (
                <TextField
                  label={t("currentToolOtherLabel")}
                  value={entry.currentTool.label}
                  onChange={(value) =>
                    setEntry(category, { currentTool: { kind: "other", label: value } })
                  }
                  placeholder={t("currentToolPlaceholder")}
                  error={issueFor("currentTool.label")}
                />
              ) : null}

              <NumberField
                label={t("seatsLabel")}
                hint={t("seatsHint")}
                value={entry.seats ?? draft.org.totalSeats}
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
                <RadioGroup
                  key={field}
                  legend={t(`${field}Label`)}
                  hint={t(`${field}Hint`)}
                  error={issueFor(field)}
                  name={`${category}-${field}`}
                  value={entry[field]}
                  choices={choices(field, values)}
                  onChange={(value) => setEntry(category, { [field]: value })}
                />
              ))}

              <RadioGroup
                legend={t("urgencyLabel")}
                hint={t("urgencyHint")}
                error={issueFor("urgency")}
                name={`${category}-urgency`}
                value={entry.urgency}
                choices={choices("urgency", URGENCIES)}
                onChange={(value) => setEntry(category, { urgency: value })}
              />
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
