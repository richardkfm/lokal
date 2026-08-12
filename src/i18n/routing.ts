import { defineRouting } from "next-intl/routing";

/**
 * German is the source language: lokal is built for German organizations first,
 * and the rulepack, report copy and terminology are authored in German. English
 * is wired from the start so that the European expansion is a content problem
 * rather than an architecture problem.
 */
export const routing = defineRouting({
  locales: ["de", "en"],
  defaultLocale: "de",
});

export type Locale = (typeof routing.locales)[number];

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" && (routing.locales as readonly string[]).includes(value)
  );
}
