import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ReportView } from "@/components/report/report-view";
import { loadReport } from "@/lib/assessments";
import "@/styles/print.css";

/**
 * The print layout.
 *
 * Fully server-rendered with no client components anywhere in the tree. That is
 * the constraint recorded in docs/adr/0002-print-first-pdf.md: it costs nothing
 * today and is what makes server-side PDF generation a later addition rather
 * than a rewrite. Do not add interactivity here.
 */
export default async function PrintReportPage(
  props: PageProps<"/[locale]/report/[id]/print">,
) {
  const { locale, id } = await props.params;
  setRequestLocale(locale);

  const loaded = await loadReport(id);
  if (!loaded) notFound();

  return (
    <div className="mx-auto max-w-4xl px-8 py-10 print:max-w-none print:px-0 print:py-0">
      <ReportView report={loaded.report} print />
    </div>
  );
}
