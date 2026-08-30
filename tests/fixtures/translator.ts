import { createTranslator } from "next-intl";
import de from "../../messages/de.json";
import en from "../../messages/en.json";

/**
 * The renderers' own translator, made strict.
 *
 * This used to be a hand-written stand-in that resolved dotted keys and
 * substituted `{name}` with a regular expression. It was close enough to pass,
 * and being close enough is the problem: it could not evaluate an ICU plural,
 * so the catalogue quietly avoided them and the reports said "1 Bereiche
 * sollten vorerst unverändert bleiben" in both languages. A test double that
 * cannot express what the real formatter can will always push the catalogue
 * toward what the double understands.
 *
 * `createTranslator` is what next-intl runs in production. Strictness comes
 * from `onError`, which throws instead of falling back to the raw key — so a
 * missing message or an unresolved placeholder fails the test rather than
 * reaching a document as "rationale.next.verify_recommendations".
 */

const CATALOGS = { de, en } as const;

export type TestLocale = keyof typeof CATALOGS;

export type StrictTranslator = (
  key: string,
  values?: Record<string, string | number | boolean | Date>,
) => string;

export function strictTranslator(locale: TestLocale): StrictTranslator {
  const t = createTranslator({
    locale,
    messages: CATALOGS[locale],
    onError: (error) => {
      throw error;
    },
  });

  return (key, values) => t(key as never, values as never) as string;
}
