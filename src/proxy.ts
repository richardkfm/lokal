import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

/**
 * Locale negotiation and prefixing.
 *
 * Next.js 16 renamed the `middleware` convention to `proxy`; next-intl still
 * exposes its handler under the middleware name.
 */
export default createMiddleware(routing);

export const config = {
  // Run on everything except API routes, Next internals and files with an
  // extension. The Markdown export lives under /api and resolves its locale
  // from the stored assessment instead.
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
