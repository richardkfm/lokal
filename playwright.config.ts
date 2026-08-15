import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end configuration.
 *
 * These tests exist to prove the one path that no unit test can reach: a real
 * browser fills the wizard, the answers survive a POST, the server recomputes
 * the report from them, and both export routes render. Everything else in this
 * repository is covered by pure functions over fixtures.
 *
 * Vitest owns `*.test.ts`; Playwright owns `*.spec.ts`. The two suites can share
 * the `tests/` tree without either one collecting the other's files.
 */

const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = `http://127.0.0.1:${PORT}`;

/** A database of its own, so a run never disturbs a local `dev.db`. */
const DATABASE_URL = process.env.E2E_DATABASE_URL ?? "file:./e2e.db";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /.*\.spec\.ts$/,

  // One worker. Both specs write to the same SQLite file, and a planning tool
  // with two specs has nothing to gain from racing them.
  workers: 1,
  fullyParallel: false,

  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  // On CI the HTML report is uploaded as an artifact, so a failure — including
  // the axe findings attached to it — is readable without reproducing the run.
  reporter: process.env.CI
    ? [["github"], ["list"], ["html", { open: "never" }]]
    : [["list"]],

  use: {
    baseURL: BASE_URL,
    // German is the source language and the default locale; the smoke test
    // reads the German catalog, so the browser has to ask for it.
    locale: "de-DE",
    timezoneId: "Europe/Berlin",
    trace: "on-first-retry",
  },

  // Chromium only. A browser matrix would triple CI time to re-prove wiring
  // that is the same in every engine; the pages carry no browser-specific code.
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  webServer: {
    // A production build, not `next dev`: the print route renders server-side
    // only, and the dev server's on-demand compilation makes the first
    // navigation of every spec look like a timeout.
    //
    // `next start` warns that it ignores `output: "standalone"`. That is the
    // right trade here — it serves the same build from the same routes, and the
    // standalone bundle is already exercised end to end by the Docker image.
    command: `pnpm run db:deploy && pnpm run build && pnpm run start --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      DATABASE_URL,
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
