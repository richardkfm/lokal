import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function LandingPage(props: PageProps<"/[locale]">) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  const t = await getTranslations("landing");

  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-ink text-4xl font-semibold tracking-tight text-balance">
        {t("heading")}
      </h1>
      <p className="text-muted mt-6 text-lg leading-relaxed text-pretty">
        {t("subheading")}
      </p>
      <p className="text-faint mt-10 text-sm">{t("placeholder")}</p>
    </div>
  );
}
