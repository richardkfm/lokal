"use client";

import { useId, type ReactNode } from "react";

/**
 * Form primitives for the intake wizard.
 *
 * Purpose-built rather than vendored from a component library: the wizard needs
 * six controls, all of them plain HTML inputs with a consistent shell. Every
 * control is a real `<input>` inside a real `<fieldset>`, so keyboard use and
 * screen readers work without any extra machinery.
 */

export function Fieldset({
  legend,
  hint,
  children,
  error,
}: {
  legend: string;
  hint?: string;
  children: ReactNode;
  error?: string | undefined;
}) {
  return (
    <fieldset className="border-line border-t pt-5">
      <legend className="text-ink -mt-9 mb-0 bg-[var(--color-paper)] pr-3 text-sm font-semibold">
        {legend}
      </legend>
      {hint ? <p className="text-muted mb-3 text-sm leading-relaxed">{hint}</p> : null}
      {children}
      {error ? (
        <p role="alert" className="mt-2 text-sm text-[var(--color-risk)]">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

export type Choice = { value: string; label: string; hint?: string };

/**
 * Radio group rendered as cards.
 *
 * Cards rather than a dropdown because the hint text matters: "low / medium /
 * high" means nothing without saying what each one implies for this
 * organization, and a select hides that.
 */
export function RadioCards({
  name,
  value,
  choices,
  onChange,
  columns = 3,
}: {
  name: string;
  value: string | undefined;
  choices: Choice[];
  onChange: (value: string) => void;
  columns?: 1 | 2 | 3;
}) {
  const groupId = useId();
  const columnClass =
    columns === 1
      ? "sm:grid-cols-1"
      : columns === 2
        ? "sm:grid-cols-2"
        : "sm:grid-cols-3";

  return (
    <div className={`grid grid-cols-1 gap-2 ${columnClass}`}>
      {choices.map((choice) => {
        const id = `${groupId}-${choice.value}`;
        const selected = value === choice.value;

        return (
          <label
            key={choice.value}
            htmlFor={id}
            className={[
              "block cursor-pointer rounded-md border px-3 py-2.5 transition-colors",
              "focus-within:ring-brand focus-within:ring-2 focus-within:ring-offset-1",
              selected
                ? "border-brand bg-[var(--color-brand-soft)]"
                : "border-line bg-surface hover:border-line-strong",
            ].join(" ")}
          >
            <input
              id={id}
              type="radio"
              name={name}
              value={choice.value}
              checked={selected}
              onChange={() => onChange(choice.value)}
              className="sr-only"
            />
            <span className="text-ink block text-sm font-medium">{choice.label}</span>
            {choice.hint ? (
              <span className="text-muted mt-0.5 block text-xs leading-snug">
                {choice.hint}
              </span>
            ) : null}
          </label>
        );
      })}
    </div>
  );
}

export function CheckboxCards({
  name,
  values,
  choices,
  onChange,
}: {
  name: string;
  values: string[];
  choices: Choice[];
  onChange: (values: string[]) => void;
}) {
  const groupId = useId();

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {choices.map((choice) => {
        const id = `${groupId}-${choice.value}`;
        const selected = values.includes(choice.value);

        return (
          <label
            key={choice.value}
            htmlFor={id}
            className={[
              "flex cursor-pointer gap-2.5 rounded-md border px-3 py-2.5 transition-colors",
              "focus-within:ring-brand focus-within:ring-2 focus-within:ring-offset-1",
              selected
                ? "border-brand bg-[var(--color-brand-soft)]"
                : "border-line bg-surface hover:border-line-strong",
            ].join(" ")}
          >
            <input
              id={id}
              type="checkbox"
              name={name}
              value={choice.value}
              checked={selected}
              onChange={() =>
                onChange(
                  selected
                    ? values.filter((v) => v !== choice.value)
                    : [...values, choice.value],
                )
              }
              className="accent-brand mt-0.5 h-4 w-4 shrink-0"
            />
            <span>
              <span className="text-ink block text-sm font-medium">{choice.label}</span>
              {choice.hint ? (
                <span className="text-muted mt-0.5 block text-xs leading-snug">
                  {choice.hint}
                </span>
              ) : null}
            </span>
          </label>
        );
      })}
    </div>
  );
}

export function NumberField({
  label,
  hint,
  value,
  onChange,
  min = 1,
  max = 500_000,
  error,
}: {
  label: string;
  hint?: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  min?: number;
  max?: number;
  error?: string | undefined;
}) {
  const id = useId();

  return (
    <div>
      <label htmlFor={id} className="text-ink block text-sm font-medium">
        {label}
      </label>
      {hint ? <p className="text-muted mt-0.5 text-xs">{hint}</p> : null}
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value ?? ""}
        onChange={(event) => {
          const next = event.target.value;
          onChange(next === "" ? undefined : Number(next));
        }}
        aria-invalid={error ? true : undefined}
        className="border-line bg-surface focus:border-brand focus:ring-brand tabular mt-1.5 w-40 rounded-md border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
      />
      {error ? (
        <p role="alert" className="mt-1 text-sm text-[var(--color-risk)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextField({
  label,
  hint,
  value,
  onChange,
  placeholder,
  maxLength = 200,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
}) {
  const id = useId();

  return (
    <div>
      <label htmlFor={id} className="text-ink block text-sm font-medium">
        {label}
      </label>
      {hint ? <p className="text-muted mt-0.5 text-xs">{hint}</p> : null}
      <input
        id={id}
        type="text"
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="border-line bg-surface focus:border-brand focus:ring-brand mt-1.5 w-full rounded-md border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
      />
    </div>
  );
}

/** Comma-separated entry for department names. */
export function TagField({
  label,
  hint,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  hint?: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}) {
  const id = useId();

  return (
    <div>
      <label htmlFor={id} className="text-ink block text-sm font-medium">
        {label}
      </label>
      {hint ? <p className="text-muted mt-0.5 text-xs">{hint}</p> : null}
      <input
        id={id}
        type="text"
        defaultValue={values.join(", ")}
        placeholder={placeholder}
        onBlur={(event) =>
          onChange(
            event.target.value
              .split(",")
              .map((part) => part.trim())
              .filter(Boolean)
              .slice(0, 40),
          )
        }
        className="border-line bg-surface focus:border-brand focus:ring-brand mt-1.5 w-full rounded-md border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
      />
    </div>
  );
}

export function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();

  return (
    <label
      htmlFor={id}
      className="border-line bg-surface hover:border-line-strong focus-within:ring-brand flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2.5 focus-within:ring-2 focus-within:ring-offset-1"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="accent-brand mt-0.5 h-4 w-4 shrink-0"
      />
      <span>
        <span className="text-ink block text-sm font-medium">{label}</span>
        {hint ? (
          <span className="text-muted mt-0.5 block text-xs leading-snug">{hint}</span>
        ) : null}
      </span>
    </label>
  );
}
