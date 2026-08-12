import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function LandingPage(props: PageProps<"/[locale]">) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  const t = await getTranslations("landing");

  const answers = ["first", "fit", "seats", "gaps", "ai", "risks"] as const;
  const nots = ["directory", "wrapper", "calculator", "compliance"] as const;

  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-ink text-4xl font-semibold tracking-tight text-balance">
        {t("heading")}
      </h1>
      <p className="text-muted mt-6 text-lg leading-relaxed text-pretty">
        {t("subheading")}
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <Link
          href="/assessment"
          className="bg-brand hover:bg-brand-strong rounded-md px-5 py-2.5 text-sm font-medium text-white"
        >
          {t("ctaPrimary")}
        </Link>
        <span className="text-faint text-xs">{t("ctaNote")}</span>
      </div>

      <section className="mt-16">
        <h2 className="text-ink text-lg font-semibold tracking-tight">
          {t("answersTitle")}
        </h2>
        <ul className="border-line divide-line mt-4 divide-y border-t border-b">
          {answers.map((key) => (
            <li key={key} className="text-muted py-3 text-sm leading-relaxed">
              {t(`answers.${key}`)}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-14">
        <h2 className="text-ink text-lg font-semibold tracking-tight">
          {t("notTitle")}
        </h2>
        <div className="mt-4 space-y-3">
          {nots.map((key) => (
            <p key={key} className="text-muted text-sm leading-relaxed">
              {t(`not.${key}`)}
            </p>
          ))}
        </div>
      </section>

      <section className="mt-14 grid gap-8 sm:grid-cols-2">
        <div>
          <h2 className="text-ink text-sm font-semibold">{t("audienceTitle")}</h2>
          <p className="text-muted mt-2 text-sm leading-relaxed">{t("audience")}</p>
        </div>
        <div>
          <h2 className="text-ink text-sm font-semibold">{t("outputTitle")}</h2>
          <p className="text-muted mt-2 text-sm leading-relaxed">{t("output")}</p>
        </div>
      </section>
    </div>
  );
}
