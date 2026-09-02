import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ReportView, reportSections } from "@/components/report/report-view";
import { ExpertContactBlock } from "@/components/shell/expert-contact";
import { loadReport } from "@/lib/assessments";
import { Link } from "@/i18n/navigation";

export default async function ReportPage(props: PageProps<"/[locale]/report/[id]">) {
  const { locale, id } = await props.params;
  setRequestLocale(locale);

  const loaded = await loadReport(id);
  if (!loaded) notFound();

  const r = await getTranslations("report");

  const sections = reportSections((key) => r(key as never));

  /**
   * The map, and the phone number.
   *
   * The anchors have existed since phase 4 and nothing linked to them. `position:
   * sticky` is CSS, so this stays a server component and the print tree is
   * untouched — ADR-0002 is not at risk from a rail.
   *
   * The contact sits here and *only* here on screen. It stays after §9 in the
   * printed document on purpose: a Beschlussvorlage that names a service
   * provider on page one reads as advertising, which is the opposite of what an
   * "internes Planungsdokument" is for. On screen, where the IT lead is working
   * and actually wants the number, the rail is where it belongs.
   */
  const rail = (
    <aside className="hidden xl:block print:hidden">
      <div className="sticky top-8 space-y-6">
        <nav aria-label={r("contents.title")}>
          <p className="text-faint text-xs tracking-wide uppercase">
            {r("contents.title")}
          </p>
          <ol className="mt-2 space-y-1">
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className={`hover:text-brand block text-sm ${
                    section.raised ? "text-ink font-medium" : "text-muted"
                  }`}
                >
                  <span className="text-faint tabular mr-2 text-xs">
                    {section.number}
                  </span>
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <Suspense fallback={null}>
          <ExpertContactBlock variant="rail" />
        </Suspense>
      </div>
    </aside>
  );

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 xl:max-w-6xl">
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

      {/* Below xl there is no room for a rail, so the document keeps the full
          width and the contact falls back to its place at the end. */}
      <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_15rem] xl:gap-10">
        <div className="min-w-0">
          <ReportView report={loaded.report} />
        </div>
        {rail}
      </div>
    </div>
  );
}
