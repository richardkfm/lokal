import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CURRENT_RULEPACK_VERSION } from "@/rulepack";
import { Wordmark } from "./wordmark";

/**
 * Site footer.
 *
 * For an AGPL project the footer is where the open-source case actually gets
 * made: the licence, the source, and the rulepack version that produced the
 * recommendations. Naming the rulepack here is the same argument the report
 * makes — the rules are readable, versioned and yours to check.
 *
 * `data-site-chrome` keeps it out of print. See site-header.tsx.
 */
export async function SiteFooter() {
  const t = await getTranslations("shell");
  const nav = await getTranslations("nav");

  const linkClass = "text-muted hover:text-ink transition-colors";

  return (
    <footer data-site-chrome className="border-line bg-sunken/40 mt-24 border-t">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Wordmark className="text-base" />
            <p className="text-muted mt-3 max-w-xs text-sm leading-relaxed">
              {t("tagline")}
            </p>
          </div>

          <div>
            <h2 className="text-ink text-xs font-semibold tracking-wide uppercase">
              {t("footerProductTitle")}
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/assessment" className={linkClass}>
                  {nav("assessment")}
                </Link>
              </li>
              <li>
                <Link href="/" className={linkClass}>
                  {nav("start")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-ink text-xs font-semibold tracking-wide uppercase">
              {t("footerProjectTitle")}
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a href="https://github.com/richardkfm/lokal" className={linkClass}>
                  {t("sourceLink")}
                </a>
              </li>
              <li>
                <a
                  href="https://www.gnu.org/licenses/agpl-3.0.html"
                  className={linkClass}
                >
                  {t("footerLicense")}
                </a>
              </li>
              <li className="text-faint tabular">
                {t("footerRulepack", { version: CURRENT_RULEPACK_VERSION })}
              </li>
            </ul>
          </div>
        </div>

        <p className="border-line text-faint mt-10 border-t pt-6 text-xs leading-relaxed">
          {t("footerNote")}
        </p>
      </div>
    </footer>
  );
}
