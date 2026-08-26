import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LocaleSwitch } from "./locale-switch";
import { Wordmark } from "./wordmark";

/**
 * Site header.
 *
 * `data-site-chrome` is load-bearing: it is what print.css keys off to keep
 * navigation out of a report someone forwards to their management. The previous
 * selector matched on a Tailwind class, which would have broken silently the
 * first time this file was restyled.
 *
 * Stays server-rendered. `LocaleSwitch` is the only client component in the
 * shell, and the shell sits in the print route's tree — see ADR-0002. That is
 * also why there is no mobile dropdown: a wrapped link row costs no client
 * state, and at four links it does not need one.
 */
export async function SiteHeader() {
  const t = await getTranslations("shell");
  const nav = await getTranslations("nav");

  return (
    <header
      data-site-chrome
      className="border-line/80 bg-paper/80 sticky top-0 z-40 border-b backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3.5">
        <Wordmark className="text-lg" />
        <span className="text-faint hidden text-xs lg:inline">{t("tagline")}</span>

        {/* Navigation and the locale switch travel together, so a narrow
            viewport wraps them as one block instead of stranding the switch on
            a row of its own. The source link drops out below `sm` — it is in
            the footer too, and at 390px it is the difference between one row
            and two. */}
        <div className="ml-auto flex items-center gap-1">
          <nav aria-label={nav("primary")} className="flex items-center gap-1">
            <Link
              href="/assessment"
              className="text-muted hover:text-ink hover:bg-sunken rounded-md px-2.5 py-1.5 text-sm transition-colors"
            >
              {nav("assessment")}
            </Link>
            <a
              href="https://github.com/richardkfm/lokal"
              className="text-muted hover:text-ink hover:bg-sunken hidden rounded-md px-2.5 py-1.5 text-sm transition-colors sm:inline-block"
            >
              {t("sourceLink")}
            </a>
          </nav>

          <LocaleSwitch />
        </div>
      </div>
    </header>
  );
}
