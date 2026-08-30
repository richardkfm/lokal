import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Architectural boundaries (see CLAUDE.md §Architecture boundaries).
 *
 * The planning engine, the rulepack and the report document must stay pure:
 * no React, no database, no i18n runtime, no Next.js app code. That is what
 * makes the engine testable with plain fixtures and keeps report generation
 * reproducible. These are enforced here rather than by convention.
 */
const pureModuleRestrictions = {
  patterns: [
    {
      group: [
        "react",
        "react-dom",
        "react/*",
        "next",
        "next/*",
        "next-intl",
        "next-intl/*",
        "@prisma/client",
        "react-hook-form",
        "@/app/*",
        "@/components/*",
        "@/lib/db",
      ],
      message:
        "src/engine, src/rulepack and src/report must stay pure (no React, DB, i18n runtime or app code). Move this logic into a renderer or a lib module.",
    },
  ],
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  {
    name: "lokal/unused-vars",
    rules: {
      // An underscore prefix marks a binding that exists only to be discarded,
      // most often when destructuring a field out of an object on purpose.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },

  {
    name: "lokal/pure-domain-layers",
    files: ["src/engine/**/*.ts", "src/rulepack/**/*.ts", "src/report/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", pureModuleRestrictions],
    },
  },

  {
    name: "lokal/no-currency-in-output",
    files: ["src/engine/**/*.ts", "src/report/**/*.ts", "src/rulepack/**/*.ts"],
    rules: {
      // Money is data in these layers and a string only in renderers.
      //
      // ADR-0003 lets lokal state euro figures, but only as a declared seat
      // count times a vendor's published list price. The pure layers carry that
      // as `{ amountCents, currency: "EUR" }` and never as rendered text —
      // formatting is `Intl.NumberFormat`'s job in a renderer, where the locale
      // is known. So the currency *code* is allowed here and the currency
      // *glyph* is not: a euro sign in this code means someone hand-formatted
      // an amount, which is how a figure loses the basis line that makes it
      // checkable.
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/[€]/]",
          message:
            "No formatted currency in engine, rulepack or report. Carry { amountCents, currency } and format with Intl.NumberFormat in a renderer (ADR-0003).",
        },
      ],
    },
  },

  {
    name: "lokal/no-hardcoded-accessible-names",
    files: ["src/components/**/*.tsx", "src/app/**/*.tsx"],
    rules: {
      // An accessible name written as a literal is a string that never went
      // through the catalogue, so it stays in one language for every locale.
      //
      // Two shipped exactly this way: `aria-label="Fortschritt"` on the wizard
      // and `${score} von 100` on the report's readiness meter. Neither is
      // visible on screen, so a design pass, a copy pass and an axe run all
      // missed them — axe cannot help here, because a German accessible name on
      // an English page is still a valid accessible name.
      //
      // A German-token scan in `tests/e2e/locale.spec.ts` catches the sentence
      // case; it cannot catch a single noun like "Fortschritt". This can, and it
      // catches it at the moment it is typed rather than a suite later.
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "JSXAttribute[name.name=/^(aria-label|title|placeholder|alt)$/] > Literal",
          message:
            'Accessible names must come from the message catalogue: use {t("key")}, not a literal.',
        },
      ],
    },
  },

  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "coverage/**"]),
]);

export default eslintConfig;
