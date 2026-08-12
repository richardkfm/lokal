import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LocaleSwitch } from "./locale-switch";

export async function SiteHeader() {
  const t = await getTranslations("shell");

  return (
    <header className="border-line bg-surface border-b">
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-4">
        <Link href="/" className="group flex items-baseline gap-2.5">
          <span className="text-ink text-lg font-semibold tracking-tight">lokal</span>
          <span className="text-faint hidden text-xs sm:inline">{t("tagline")}</span>
        </Link>
        <div className="ml-auto">
          <LocaleSwitch />
        </div>
      </div>
    </header>
  );
}
