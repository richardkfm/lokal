import { Fragment } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Badge, KpiCard, Meter } from "@/components/report/indicators";
import { PathRail, SpinSeal, WordCycle } from "@/components/ui/motion";
import { Terminal } from "@/components/ui/terminal";
import { Link } from "@/i18n/navigation";

/**
 * The landing page.
 *
 * lokal is free and AGPL, so there is no sales motion behind it — this page is
 * the sales motion. It sells the way the product argues: through specificity,
 * not adjectives. The section that does most of the work is the plan excerpt,
 * because the single most persuasive thing lokal can show is what a plan
 * actually looks like — a sequence, a "keep for now", a candidate ruled out with
 * its reason. That is also the clearest restatement of the rule the whole
 * project turns on: this is not an alternatives finder.
 *
 * Fully server-rendered, like every other page here.
 */

/** Self-hosting, as three real commands. Kept identical to the README's
 *  "Quick start" block: a snippet on a landing page that does not actually work
 *  is worse than no snippet. */
const INSTALL = [
  "git clone https://github.com/richardkfm/lokal.git",
  "cd lokal",
  "docker compose up --build",
];

export default async function LandingPage(props: PageProps<"/[locale]">) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  const t = await getTranslations("landing");

  const answers = ["first", "fit", "seats", "gaps", "ai", "risks"] as const;
  const trust = ["account", "noLlm", "license", "selfHost"] as const;
  const steps = [1, 2, 3] as const;
  const formats = ["web", "markdown", "print"] as const;
  const chips = [
    "municipality",
    "district",
    "school",
    "utility",
    "association",
    "sme",
  ] as const;

  return (
    <>
      {/* Hero */}
      <section className="from-brand-soft/60 border-line/60 relative isolate overflow-hidden border-b bg-gradient-to-b to-[var(--color-paper)]">
        {/* Decorative only — see `.hero-field` in globals.css. Four layers on
            non-harmonic periods, so the motion never visibly repeats. */}
        <div className="hero-field" aria-hidden="true">
          <span className="hero-glow hero-glow-a" />
          <span className="hero-glow hero-glow-b" />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-16 sm:pt-28 sm:pb-20">
          <div className="max-w-3xl">
            {/* The cycling word names the incumbent the visitor is actually
                leaving. `headingWord1` is the resting word — what shows in
                print, under reduced motion and in any paused frame — so it is
                the most common one rather than the most interesting. */}
            <h1 className="text-ink display text-4xl font-semibold sm:text-5xl lg:text-6xl">
              {t("headingLead")}{" "}
              <WordCycle
                className="text-brand"
                spoken={t("headingSpoken")}
                words={[
                  t("headingWord1"),
                  t("headingWord2"),
                  t("headingWord3"),
                  t("headingWord4"),
                ]}
              />{" "}
              {t("headingTail")}
            </h1>
            <p className="text-muted mt-6 max-w-2xl text-lg leading-relaxed text-pretty sm:text-xl">
              {t("subheading")}
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/assessment"
                className="bg-brand hover:bg-brand-strong shadow-card rounded-lg px-6 py-3 text-sm font-medium text-white transition-colors"
              >
                {t("ctaPrimary")}
              </Link>
              <a
                href="#how"
                className="border-line bg-surface text-ink hover:border-line-strong hover:bg-sunken rounded-lg border px-5 py-3 text-sm font-medium transition-colors"
              >
                {t("ctaSecondary")}
              </a>
            </div>

            <p className="text-faint mt-4 text-xs">{t("ctaNote")}</p>

            <ul className="text-muted mt-10 flex flex-wrap gap-x-6 gap-y-2 text-xs">
              {trust.map((key) => (
                <li key={key} className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="bg-brand/50 h-1 w-1 rounded-full"
                  />
                  {t(`trust.${key}`)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* What a plan looks like — the section that does the selling. */}
      <section className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
        <div className="reveal max-w-2xl">
          <h2 className="text-ink display text-3xl font-semibold">
            {t("preview.title")}
          </h2>
          <p className="text-muted mt-4 leading-relaxed text-pretty">
            {t("preview.lead")}
          </p>
        </div>

        {/* A labelled region rather than a bare div: it names the example for a
            screen reader, so the excerpt is clearly demarcated from the real
            claims around it and cannot be mistaken for generated output. */}
        <section
          aria-label={t("preview.badge")}
          className="reveal border-line bg-surface shadow-hero mt-10 overflow-hidden rounded-xl border"
        >
          <div className="border-line bg-sunken/50 flex flex-wrap items-center gap-3 border-b px-6 py-4">
            <div>
              <p className="text-ink font-semibold">{t("preview.docTitle")}</p>
              <p className="text-faint mt-0.5 text-xs">{t("preview.docSubtitle")}</p>
            </div>
            <span className="ml-auto">
              <Badge tone="brand">{t("preview.badge")}</Badge>
            </span>
          </div>

          <div className="space-y-8 p-6 sm:p-8">
            <div className="reveal grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                label={t("preview.readinessLabel")}
                value={t("preview.readinessValue")}
                detail="68 / 100"
                tone="good"
              />
              <KpiCard
                label={t("preview.postureLabel")}
                value={t("preview.postureValue")}
                detail={t("preview.postureDetail")}
              />
              {/* Savings as a band with no figure attached. This is the one
                  claim the old "what lokal is not" section made that nothing
                  else on the page covered, and the report states it exactly
                  this way — so the excerpt shows it rather than asserting it. */}
              <KpiCard
                label={t("preview.savingsLabel")}
                value={t("preview.savingsValue")}
                detail={t("preview.savingsDetail")}
              />
              <KpiCard
                label={t("preview.aiLabel")}
                value={t("preview.aiValue")}
                detail={t("preview.aiDetail")}
                tone="caution"
              />
            </div>

            <Meter
              label={t("preview.readinessLabel")}
              score={68}
              caption={t("preview.readinessCaption")}
            />

            <div>
              <h3 className="text-ink text-sm font-semibold">
                {t("preview.roadmapTitle")}
              </h3>
              <ol className="mt-3 space-y-2">
                {[1, 2].map((phase) => (
                  <li
                    key={phase}
                    className="border-line bg-sunken/40 flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-lg border p-4"
                  >
                    <span className="text-brand font-mono text-xs font-medium">
                      {t(`preview.phase${phase}Label`)}
                    </span>
                    <span className="text-ink text-sm font-medium">
                      {t(`preview.phase${phase}Title`)}
                    </span>
                    <span className="text-faint tabular ml-auto text-xs">
                      {t(`preview.phase${phase}Detail`)}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="reveal grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-[var(--color-good)]/30 bg-[var(--color-good-soft)] p-4">
                <h3 className="text-ink text-sm font-semibold">
                  {t("preview.keepTitle")}
                </h3>
                <p className="text-ink mt-2 text-sm font-medium">
                  {t("preview.keepItem")}
                </p>
                <p className="text-muted mt-1 text-xs leading-relaxed">
                  {t("preview.keepReason")}
                </p>
              </div>
              <div className="border-line bg-sunken/40 rounded-lg border p-4">
                <h3 className="text-faint text-sm font-semibold">
                  {t("preview.ruledOutTitle")}
                </h3>
                <p className="text-muted mt-2 text-sm font-medium line-through">
                  {t("preview.ruledOutItem")}
                </p>
                <p className="text-muted mt-1 text-xs leading-relaxed">
                  {t("preview.ruledOutReason")}
                </p>
              </div>
            </div>
          </div>

          <p className="border-line text-faint border-t px-6 py-3 text-xs">
            {t("preview.footnote")}
          </p>
        </section>
      </section>

      {/* How it works */}
      <section id="how" className="border-line bg-sunken/40 scroll-mt-20 border-y">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="reveal max-w-2xl">
            <h2 className="text-ink display text-3xl font-semibold">
              {t("how.title")}
            </h2>
            <p className="text-muted mt-4 leading-relaxed">{t("how.lead")}</p>
          </div>

          {/* The rail between the cards is the point of the section: intake,
              rules and plan are one sequence, not three features. The dot
              travelling it says so without a word of copy. */}
          <ol className="mt-10 grid items-stretch gap-6 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
            {steps.map((step, index) => (
              <Fragment key={step}>
                {index > 0 ? (
                  <li
                    aria-hidden="true"
                    className="hidden items-center md:flex"
                    role="presentation"
                  >
                    <PathRail className="w-10" />
                  </li>
                ) : null}
                <li className="reveal border-line bg-surface shadow-card rounded-xl border p-6">
                  <span className="text-brand font-mono text-sm font-medium">
                    {String(step).padStart(2, "0")}
                  </span>
                  <h3 className="text-ink mt-3 font-semibold">
                    {t(`how.step${step}Title`)}
                  </h3>
                  <p className="text-muted mt-2 text-sm leading-relaxed">
                    {t(`how.step${step}Body`)}
                  </p>
                </li>
              </Fragment>
            ))}
          </ol>

          <p className="border-brand text-ink mt-8 max-w-2xl border-l-2 pl-5 text-sm leading-relaxed">
            {t("how.proof")}
          </p>
        </div>
      </section>

      {/* Questions this plan answers */}
      <section className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
        <h2 className="reveal text-ink display max-w-2xl text-3xl font-semibold">
          {t("answersTitle")}
        </h2>
        <ul className="mt-10 grid gap-x-12 gap-y-px sm:grid-cols-2">
          {answers.map((key, index) => (
            <li key={key} className="reveal border-line flex gap-4 border-t py-5">
              <span className="text-faint tabular pt-0.5 font-mono text-xs">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="text-ink leading-relaxed">{t(`answers.${key}`)}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* What you end up with */}
      <section className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
        <div className="reveal max-w-2xl">
          <h2 className="text-ink display text-3xl font-semibold">
            {t("outputTitle")}
          </h2>
          <p className="text-muted mt-4 leading-relaxed">{t("formats.lead")}</p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {formats.map((key) => (
            <div
              key={key}
              className="reveal border-line bg-surface shadow-card rounded-xl border p-6"
            >
              <h3 className="text-ink font-semibold">{t(`formats.${key}Title`)}</h3>
              <p className="text-muted mt-2 text-sm leading-relaxed">
                {t(`formats.${key}Body`)}
              </p>
            </div>
          ))}
        </div>

        <div className="reveal border-line mt-16 border-t pt-10">
          <h3 className="text-ink text-sm font-semibold">{t("audienceTitle")}</h3>
          <ul className="reveal mt-4 flex flex-wrap gap-2">
            {chips.map((key) => (
              <li
                key={key}
                className="border-line bg-surface text-muted rounded-full border px-3.5 py-1.5 text-sm"
              >
                {t(`audienceChips.${key}`)}
              </li>
            ))}
          </ul>
          <p className="text-faint mt-4 max-w-2xl text-sm leading-relaxed">
            {t("audience")}
          </p>
        </div>
      </section>

      {/* Sovereignty */}
      <section className="border-line bg-sunken/40 border-y">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-ink display text-3xl font-semibold">
                {t("sovereignty.title")}
              </h2>
              <p className="text-muted mt-4 leading-relaxed text-pretty">
                {t("sovereignty.lead")}
              </p>

              <dl className="mt-8 space-y-6">
                {(["selfHost", "rulepack", "license"] as const).map((key) => (
                  <div key={key}>
                    <dt className="text-ink text-sm font-semibold">
                      {t(`sovereignty.${key}Title`)}
                    </dt>
                    <dd className="text-muted mt-1 text-sm leading-relaxed">
                      {t(`sovereignty.${key}Body`)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <Terminal
              label={t("sovereignty.terminalLabel")}
              lines={INSTALL}
              className="reveal"
            />
          </div>
        </div>
      </section>

      {/* Closing */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="flex flex-wrap items-center gap-x-16 gap-y-10">
          <div className="reveal max-w-2xl flex-1">
            <h2 className="text-ink display text-3xl font-semibold">
              {t("closing.title")}
            </h2>
            <p className="text-muted mt-4 leading-relaxed text-pretty">
              {t("closing.body")}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/assessment"
                className="bg-brand hover:bg-brand-strong shadow-card rounded-lg px-6 py-3 text-sm font-medium text-white transition-colors"
              >
                {t("closing.cta")}
              </Link>
              <span className="text-faint text-xs">{t("closing.note")}</span>
            </div>
          </div>

          {/* The only ornament on the page, and it is made of words the product
              stands behind. Decorative: the same three claims are made in plain
              text in the sovereignty section above. */}
          <SpinSeal
            id="lokal-seal"
            text={t("sealText")}
            className="text-faint hidden h-40 w-40 shrink-0 lg:inline-flex"
          >
            <span className="text-brand font-mono text-lg font-medium">&gt;lokal</span>
          </SpinSeal>
        </div>
      </section>
    </>
  );
}
