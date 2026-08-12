import { getRequestConfig } from "next-intl/server";
import { isLocale, routing } from "./routing";

/**
 * Resolves messages for the active request.
 *
 * `requestLocale` is used rather than `next/root-params` because this config is
 * also reached from Route Handlers (the Markdown export), where root params are
 * not available. An explicitly passed locale always wins — the export route reads
 * the locale off the stored assessment and passes it in, so a report always
 * renders in the language it was created in.
 */
export default getRequestConfig(async ({ locale, requestLocale }) => {
  const requested = locale ?? (await requestLocale);
  const active = isLocale(requested) ? requested : routing.defaultLocale;

  return {
    locale: active,
    messages: (await import(`../../messages/${active}.json`)).default,
    // Reports are dated planning documents; a fixed time zone keeps the
    // generated date stable regardless of where the server runs.
    timeZone: "Europe/Berlin",
  };
});
