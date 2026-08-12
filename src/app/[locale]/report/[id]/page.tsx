import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ReportView } from "@/components/report/report-view";
import { loadReport } from "@/lib/assessments";
import { Link } from "@/i18n/navigation";

export default async function ReportPage(props: PageProps<"/[locale]/report/[id]">) {
  const { locale, id } = await props.params;
  setRequestLocale(locale);

  const loaded = await loadReport(id);
  if (!loaded) notFound();

  const r = await getTranslations("report");

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      {loaded.rulesChangedSinceAssessment ? (
        <p className="text-ink mb-6 rounded-md border border-[var(--color-caution)] bg-[var(--color-caution-soft)] p-3 text-xs leading-relaxed">
          {r("rulesChanged", { version: loaded.assessmentRulepackVersion })}
        </p>
      ) : null}

      <div className="mb-8 flex flex-wrap gap-3">
        <a
          href={`/api/report/${id}/markdown`}
          className="border-line text-ink hover:bg-sunken rounded-md border px-3 py-1.5 text-sm"
        >
          {r("actions.markdown")}
        </a>
        <Link
          href={`/report/${id}/print`}
          className="border-line text-ink hover:bg-sunken rounded-md border px-3 py-1.5 text-sm"
        >
          {r("actions.print")}
        </Link>
      </div>

      <ReportView report={loaded.report} />
    </div>
  );
}
