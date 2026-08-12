import { getTranslations } from "next-intl/server";

export async function SiteFooter() {
  const t = await getTranslations("shell");

  return (
    <footer className="border-line mt-16 border-t">
      <div className="text-faint mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-6 text-xs">
        <p>{t("footerNote")}</p>
        <a
          href="https://github.com/richardkfm/lokal"
          className="hover:text-ink ml-auto underline underline-offset-2"
        >
          {t("sourceLink")}
        </a>
      </div>
    </footer>
  );
}
