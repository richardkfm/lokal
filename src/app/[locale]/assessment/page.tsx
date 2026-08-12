import { getTranslations, setRequestLocale } from "next-intl/server";
import { Wizard } from "@/components/wizard/wizard";

export default async function AssessmentPage(props: PageProps<"/[locale]/assessment">) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  const t = await getTranslations("wizard");

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-ink text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-muted mt-2 mb-10 text-sm leading-relaxed">{t("subtitle")}</p>
      <Wizard />
    </div>
  );
}
