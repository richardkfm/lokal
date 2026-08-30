import type { ReactNode } from "react";

/**
 * Report indicators.
 *
 * All CSS, no canvas and no charting library. A canvas chart does not print
 * reliably, and the report exists to be printed and handed to someone. These
 * also carry a text label in every case, so the meaning survives greyscale
 * printing and does not depend on colour alone.
 */

type Tone = "good" | "caution" | "risk" | "neutral" | "brand";

const TONE_BAR: Record<Tone, string> = {
  good: "bg-[var(--color-good)]",
  caution: "bg-[var(--color-caution)]",
  risk: "bg-[var(--color-risk)]",
  neutral: "bg-[var(--color-neutral)]",
  brand: "bg-brand",
};

const TONE_CHIP: Record<Tone, string> = {
  good: "bg-[var(--color-good-soft)] text-[var(--color-good)] border-[var(--color-good)]",
  caution:
    "bg-[var(--color-caution-soft)] text-[var(--color-caution)] border-[var(--color-caution)]",
  risk: "bg-[var(--color-risk-soft)] text-[var(--color-risk)] border-[var(--color-risk)]",
  neutral:
    "bg-[var(--color-neutral-soft)] text-muted border-[var(--color-line-strong)]",
  brand: "bg-[var(--color-brand-soft)] text-brand border-brand",
};

export function toneForScore(score: number): Tone {
  if (score >= 80) return "good";
  if (score >= 55) return "brand";
  if (score >= 30) return "caution";
  return "risk";
}

/**
 * A 0–100 band with its label. The number is never shown without the word.
 *
 * `scaleLabel` is the already-translated "{score} von 100" phrase, and it is
 * required rather than optional on purpose. It used to be built inline here,
 * which meant the accessible name of every meter in the report was German — on
 * the English report too, and on the printed copy. Making the caller supply it
 * is what stops that from being reintroduced by forgetting a prop.
 */
export function Meter({
  label,
  score,
  caption,
  scaleLabel,
  tone,
}: {
  label: string;
  score: number;
  caption: string;
  scaleLabel: string;
  tone?: Tone;
}) {
  const resolved = tone ?? toneForScore(score);

  return (
    <div className="break-inside-avoid">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-ink text-sm font-medium">{label}</span>
        <span className="text-muted tabular text-xs">
          {caption} · {score}/100
        </span>
      </div>
      <div
        className="bg-sunken mt-1.5 h-2 w-full overflow-hidden rounded-full print:border print:border-[var(--color-line-strong)]"
        role="img"
        aria-label={`${label}: ${caption}, ${scaleLabel}`}
      >
        <div
          className={`h-full rounded-full ${TONE_BAR[resolved]}`}
          style={{ width: `${Math.max(score, 2)}%` }}
        />
      </div>
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONE_CHIP[tone]}`}
    >
      {children}
    </span>
  );
}

/** Migration difficulty as filled dots, with the word beside it. */
export function ComplexityDots({ score, label }: { score: number; label: string }) {
  const filled = Math.round(score);

  return (
    <span className="inline-flex items-center gap-1.5" aria-label={label}>
      <span className="flex gap-0.5" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((step) => (
          <span
            key={step}
            className={[
              "h-1.5 w-1.5 rounded-full border",
              step <= filled
                ? "border-[var(--color-ink)] bg-[var(--color-ink)]"
                : "border-[var(--color-line-strong)]",
            ].join(" ")}
          />
        ))}
      </span>
      <span className="text-muted text-xs">{label}</span>
    </span>
  );
}

/**
 * A large figure with the line that makes it checkable underneath it.
 *
 * `basis` is not optional decoration: ADR-0003 guardrail 3 says a euro amount
 * never appears without its plan name, source and observation date, and putting
 * that in the component signature is the cheapest way to keep a future caller
 * from rendering a bare number.
 *
 * `.tabular` gives the digits fixed advance widths so two figures stacked in a
 * grid line up on the decimal, which is what makes them read as an account
 * rather than as marketing.
 */
export function FigureCard({
  label,
  value,
  basis,
  tone = "neutral",
}: {
  label: string;
  value: string;
  basis: string;
  tone?: Tone;
}) {
  return (
    <div className="border-line bg-surface break-inside-avoid rounded-lg border p-4">
      <p className="text-faint text-xs tracking-wide uppercase">{label}</p>
      <p
        className={`display tabular mt-1.5 text-2xl leading-none font-semibold ${
          tone === "good" ? "text-[var(--color-good)]" : "text-ink"
        }`}
      >
        {value}
      </p>
      <p className="text-muted mt-2 text-xs leading-snug">{basis}</p>
    </div>
  );
}

/** One of the six at-a-glance figures. */
export function KpiCard({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: Tone;
}) {
  return (
    <div className="border-line bg-surface break-inside-avoid rounded-lg border p-4">
      <p className="text-faint text-xs tracking-wide uppercase">{label}</p>
      <p
        className={`mt-1.5 text-lg leading-tight font-semibold ${
          tone === "risk"
            ? "text-[var(--color-risk)]"
            : tone === "caution"
              ? "text-[var(--color-caution)]"
              : tone === "good"
                ? "text-[var(--color-good)]"
                : "text-ink"
        }`}
      >
        {value}
      </p>
      {detail ? <p className="text-muted mt-1 text-xs leading-snug">{detail}</p> : null}
    </div>
  );
}

/** Seats affected, shown against the organization total. */
export function SeatImpactBar({
  seats,
  total,
  label,
}: {
  seats: number;
  total: number;
  label: string;
}) {
  const share = total > 0 ? Math.min((seats / total) * 100, 100) : 0;

  return (
    <div className="break-inside-avoid">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-muted text-xs">{label}</span>
        <span className="text-ink tabular text-xs font-medium">
          {seats} / {total}
        </span>
      </div>
      <div className="bg-sunken mt-1 h-1.5 w-full overflow-hidden rounded-full print:border print:border-[var(--color-line-strong)]">
        <div className="bg-brand h-full rounded-full" style={{ width: `${share}%` }} />
      </div>
    </div>
  );
}

export function Section({
  id,
  number,
  title,
  lead,
  children,
  breakBefore,
}: {
  id: string;
  number: number;
  title: string;
  lead?: string;
  children: ReactNode;
  breakBefore?: boolean;
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-24 ${breakBefore ? "print:break-before-page" : ""}`}
    >
      <h2 className="text-ink border-line flex items-baseline gap-3 border-b pb-2 text-lg font-semibold tracking-tight">
        <span className="text-faint tabular text-sm">{number}</span>
        {title}
      </h2>
      {lead ? <p className="text-muted mt-3 text-sm leading-relaxed">{lead}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}
