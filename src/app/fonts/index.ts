import localFont from "next/font/local";

/**
 * Typefaces.
 *
 * Loaded from committed files rather than `next/font/google`, because this
 * project promises builds that work offline and air-gapped — see
 * `src/app/fonts/README.md` for provenance, subsetting and licensing.
 *
 * Both are declared as variable fonts with a weight range, so every weight the
 * design uses comes out of one file.
 */

/** UI text. Chosen for small sizes and for having real tabular figures, which
 *  the `.tabular` class in globals.css depends on. */
export const sans = localFont({
  src: "./inter-latin.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--font-inter",
  // Metric-matched fallback: what the browser paints before the file lands, and
  // what it keeps painting if the file is missing from an air-gapped build.
  adjustFontFallback: "Arial",
  fallback: ["ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "sans-serif"],
});

/** The `>lokal` wordmark and terminal blocks. The same prompt glyph in both is
 *  what ties the identity together, so this file earns its weight twice. */
export const mono = localFont({
  src: "./jetbrains-mono-latin.woff2",
  weight: "100 800",
  style: "normal",
  display: "swap",
  variable: "--font-jetbrains-mono",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
});
