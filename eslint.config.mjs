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
      // lokal never states euro amounts. Savings are qualitative bands with
      // named drivers — inventing precision would be the fastest way to lose
      // credibility with the audiences this report is written for.
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/[€]|\\bEUR\\b/]",
          message:
            "No currency amounts in engine, rulepack or report output. Use qualitative savings bands instead.",
        },
      ],
    },
  },

  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "coverage/**"]),
]);

export default eslintConfig;
