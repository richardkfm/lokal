"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const LABELS: Record<string, string> = { de: "Deutsch", en: "English" };

export function LocaleSwitch() {
  const active = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("nav");

  return (
    <nav aria-label={t("language")} className="flex items-center gap-1 text-xs">
      {routing.locales.map((locale) => {
        const isActive = locale === active;
        return (
          <button
            key={locale}
            type="button"
            lang={locale}
            aria-current={isActive ? "true" : undefined}
            onClick={() => router.replace(pathname, { locale })}
            className={
              isActive
                ? "bg-sunken text-ink rounded-sm px-2 py-1 font-medium"
                : "text-muted hover:text-ink rounded-sm px-2 py-1"
            }
          >
            {LABELS[locale] ?? locale}
          </button>
        );
      })}
    </nav>
  );
}
