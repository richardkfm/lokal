import { getTranslations } from "next-intl/server";
import { loadReport } from "@/lib/assessments";
import { toMarkdown } from "@/report/to-markdown";

/**
 * Markdown export.
 *
 * The locale comes from the stored assessment rather than the request, so a
 * report always exports in the language it was created in. That is why the i18n
 * request config resolves an explicitly passed locale ahead of anything else.
 */
export async function GET(
  _request: Request,
  context: RouteContext<"/api/report/[id]/markdown">,
) {
  const { id } = await context.params;

  const loaded = await loadReport(id);
  if (!loaded) {
    return new Response("Not found", { status: 404 });
  }

  const t = await getTranslations({ locale: loaded.report.locale });
  const markdown = toMarkdown(loaded.report, {
    t: (key, values) => t(key as never, values as never),
  });

  return new Response(markdown, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `attachment; filename="lokal-plan-${id}.md"`,
    },
  });
}
