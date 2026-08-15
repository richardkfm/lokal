import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * The one path no unit test can reach.
 *
 * Landing → six-step wizard → submit → report → Markdown → print. Everything
 * else in this repository is pure functions over fixtures; this proves the
 * pieces are actually wired to each other in a browser.
 *
 * The steps are serial and share one report id on purpose: producing a report
 * costs a full intake, and running it four times to keep the tests independent
 * would buy nothing.
 */

test.describe.configure({ mode: "serial" });

/** The assessment id minted by the wizard, reused by the export tests. */
let reportId = "";

/**
 * A choice card.
 *
 * Every option is a real `<input>` inside its own `<label>`, so clicking the
 * label is both what a user does and what keeps this test honest: if the form
 * ever stops being a set of labelled native controls, this stops finding them.
 */
function option(scope: Page | Locator, name: string, value: string): Locator {
  return scope.locator(`label:has(input[name="${name}"][value="${value}"])`);
}

/** The per-category detail block, addressed the way a screen reader would. */
function categoryBlock(page: Page, category: string): Locator {
  return page.getByRole("region", { name: CATEGORY_LABELS[category] });
}

const CATEGORY_LABELS: Record<string, string> = {
  office_docs: "Office und Dokumente",
  file_sharing: "Dateiablage",
  intranet_wiki: "Intranet und Wissen",
};

/** A 180-seat municipality: the organization the v0.1.0 goal is written around. */
const CATEGORIES = ["office_docs", "file_sharing", "intranet_wiki"] as const;

const DETAIL: Record<
  (typeof CATEGORIES)[number],
  {
    currentTool: string;
    seats: number;
    criticality: string;
    pain: string;
    lockInConcern: string;
    trainingSensitivity: string;
    urgency: string;
  }
> = {
  office_docs: {
    currentTool: "Microsoft 365",
    seats: 175,
    criticality: "high",
    pain: "medium",
    lockInConcern: "high",
    trainingSensitivity: "high",
    urgency: "this_year",
  },
  file_sharing: {
    currentTool: "Windows-Dateiserver",
    seats: 160,
    criticality: "high",
    pain: "high",
    lockInConcern: "medium",
    trainingSensitivity: "medium",
    urgency: "now",
  },
  intranet_wiki: {
    currentTool: "Netzlaufwerk",
    seats: 40,
    criticality: "low",
    pain: "low",
    lockInConcern: "low",
    trainingSensitivity: "low",
    urgency: "later",
  },
};

test("the landing page leads into the wizard", async ({ page }) => {
  await page.goto("/");

  // `/` negotiates a locale; German is the default and the source language.
  await expect(page).toHaveURL(/\/de$/);
  await expect(
    page.getByRole("heading", {
      name: "Vom Ist-Zustand zum belastbaren Migrationsplan",
    }),
  ).toBeVisible();

  // The promise this tool is built on. If the landing page starts selling an
  // alternatives directory instead, that is a product regression, not a typo.
  await expect(page.getByText("Kein Verzeichnis von Alternativen.")).toBeVisible();

  await page.getByRole("link", { name: "Erhebung starten" }).click();
  await expect(page).toHaveURL(/\/de\/assessment$/);
  await expect(
    page.getByRole("heading", { name: "Erhebung", exact: true }),
  ).toBeVisible();
});

test("a full intake produces a report", async ({ page }) => {
  await page.goto("/de/assessment");

  // Step 1 — organization.
  await expect(page.getByRole("heading", { name: "Ihre Organisation" })).toBeVisible();
  await option(page, "orgType", "municipality").click();
  await page.getByLabel("Arbeitsplätze insgesamt").fill("180");
  await page.getByLabel("Betroffene Bereiche").fill("Bauamt, Bürgerbüro, Kämmerei");
  await page.getByLabel("Öffentlicher Auftrag").check();
  // The size bucket is derived, never asked for; a contradiction is impossible.
  await expect(page.getByText("Größenklasse: 51-250")).toBeVisible();
  await page.getByRole("button", { name: "Weiter" }).click();

  // Step 2 — operating model.
  await expect(
    page.getByRole("heading", { name: "Betrieb und Kapazitäten" }),
  ).toBeVisible();
  await option(page, "hostingPreference", "self_hosted").click();
  await option(page, "linuxCapability", "basic").click();

  // The three capacity questions all offer "niedrig / mittel / hoch". Each one
  // has to name itself, or the options mean nothing on their own.
  for (const legend of [
    "Verfügbare Administrationszeit",
    "IT-Reife",
    "Benutzerverwaltung",
  ]) {
    await expect(page.getByRole("group", { name: legend })).toBeVisible();
  }

  await option(page, "adminCapacity", "low").click();
  await option(page, "itMaturity", "medium").click();
  await option(page, "identityMaturity", "medium").click();
  await option(page, "supportExpectation", "vendor_support_needed").click();

  // Fifteen minutes of answers must survive a stray reload. The draft is
  // persisted; the position in it is not, so a reload lands back on step one
  // with every answer still in place.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Ihre Organisation" })).toBeVisible();
  await expect(
    page.locator('input[name="orgType"][value="municipality"]'),
  ).toBeChecked();
  await expect(page.getByLabel("Arbeitsplätze insgesamt")).toHaveValue("180");

  await page.getByRole("button", { name: "Betrieb" }).click();
  await expect(
    page.getByRole("heading", { name: "Betrieb und Kapazitäten" }),
  ).toBeVisible();
  await expect(
    page.locator('input[name="hostingPreference"][value="self_hosted"]'),
  ).toBeChecked();
  await expect(page.locator('input[name="adminCapacity"][value="low"]')).toBeChecked();

  await page.getByRole("button", { name: "Weiter" }).click();

  // Step 3 — categories in scope.
  await expect(
    page.getByRole("heading", { name: "Welche Bereiche betrachten wir?" }),
  ).toBeVisible();
  for (const category of CATEGORIES) {
    await option(page, "categories", category).click();
  }
  await page.getByRole("button", { name: "Weiter" }).click();

  // Step 4 — per-category detail.
  await expect(page.getByRole("heading", { name: "Angaben je Bereich" })).toBeVisible();
  for (const category of CATEGORIES) {
    const block = categoryBlock(page, category);
    const answers = DETAIL[category];

    await block.getByLabel("Derzeit eingesetzt").fill(answers.currentTool);
    await block.getByLabel("Betroffene Arbeitsplätze").fill(String(answers.seats));
    await option(block, `${category}-criticality`, answers.criticality).click();
    await option(block, `${category}-pain`, answers.pain).click();
    await option(block, `${category}-lockInConcern`, answers.lockInConcern).click();
    await option(
      block,
      `${category}-trainingSensitivity`,
      answers.trainingSensitivity,
    ).click();
    await option(block, `${category}-urgency`, answers.urgency).click();
  }
  await page.getByRole("button", { name: "Weiter" }).click();

  // Step 5 — AI posture.
  await expect(page.getByRole("heading", { name: "Haltung zu KI" })).toBeVisible();
  await option(page, "aiInterest", "cautious").click();
  await option(page, "dataSensitivity", "high").click();
  await option(page, "hardwareProfile", "office_pcs").click();
  await option(page, "aiDeployment", "local_device").click();
  await option(page, "aiUseCases", "summarization").click();
  await page.getByRole("button", { name: "Weiter" }).click();

  // Step 6 — review.
  await expect(page.getByRole("heading", { name: "Angaben prüfen" })).toBeVisible();
  await expect(page.getByText("180 (51-250)")).toBeVisible();
  await expect(page.getByText("Bauamt, Bürgerbüro, Kämmerei")).toBeVisible();
  // A coherent intake raises no data-quality warnings; the one below does.
  await expect(page.getByText("Hinweise zu Ihren Angaben")).toBeHidden();

  // Seat divergence is surfaced, not silently accepted — and it warns rather
  // than blocks, because the respondent may well be right and lokal is not in a
  // position to overrule them.
  await page.getByRole("button", { name: "Details" }).click();
  await categoryBlock(page, "intranet_wiki")
    .getByLabel("Betroffene Arbeitsplätze")
    .fill("400");
  await page.getByRole("button", { name: "Prüfen" }).click();
  await expect(page.getByText("Hinweise zu Ihren Angaben")).toBeVisible();
  await expect(
    page.getByText("Ein Bereich weist mehr Arbeitsplätze aus als die Organisation"),
  ).toBeVisible();

  await page.getByRole("button", { name: "Details" }).click();
  await categoryBlock(page, "intranet_wiki")
    .getByLabel("Betroffene Arbeitsplätze")
    .fill(String(DETAIL.intranet_wiki.seats));
  await page.getByRole("button", { name: "Prüfen" }).click();
  await expect(page.getByText("Hinweise zu Ihren Angaben")).toBeHidden();

  await page.getByRole("button", { name: "Plan erstellen" }).click();

  await expect(page).toHaveURL(/\/de\/report\/[A-Za-z0-9_-]{21}$/, { timeout: 30_000 });
  reportId = page.url().split("/").pop()!;
});

test("the report answers the questions the landing page promised", async ({ page }) => {
  await page.goto(`/de/report/${reportId}`);

  await expect(page.getByRole("heading", { name: "Migrationsplan" })).toBeVisible();
  await expect(page.getByText("Kommune · 180 Arbeitsplätze")).toBeVisible();

  for (const title of [
    "Empfohlener Zielaufbau",
    "Migrationsfahrplan",
    "Bereitschaft und Kapazität",
    "Lokale KI",
    "Nächste Schritte",
  ]) {
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
  }

  // Every assessed category is accounted for in the target stack.
  const stack = page.locator("#stack");
  for (const category of CATEGORIES) {
    await expect(
      stack.getByRole("heading", { name: CATEGORY_LABELS[category]!, exact: true }),
    ).toHaveCount(1);
  }

  // Two of the four outputs that make this a plan rather than a list of
  // alternatives (CLAUDE.md). Both are produced by this intake on purpose:
  // "considered and ruled out" names what was eliminated and why, and "keep for
  // now" names what the organization should deliberately not touch yet.
  const ruledOut = stack.locator("details summary", {
    hasText: "geprüft und ausgeschieden",
  });
  expect(await ruledOut.count()).toBeGreaterThan(0);
  await ruledOut.first().click();
  await expect(
    page.getByRole("heading", { name: "Vorerst unverändert lassen" }),
  ).toBeVisible();
  await expect(page.locator("#roadmap")).toContainText("Intranet und Wissen");

  // No euro figures anywhere in generated output — definition of done, item 6.
  const text = await page.locator("article").innerText();
  expect(text).not.toMatch(/€|\bEUR\b/);
});

test("the Markdown export downloads as a file", async ({ page }) => {
  const response = await page.request.get(`/api/report/${reportId}/markdown`);

  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/markdown");
  expect(response.headers()["content-disposition"]).toContain(
    `filename="lokal-plan-${reportId}.md"`,
  );

  const markdown = await response.text();
  expect(markdown.startsWith("# ")).toBe(true);
  expect(markdown).toContain("Empfohlener Zielaufbau");
  expect(markdown).toContain("Migrationsfahrplan");
  expect(markdown).not.toMatch(/€|\bEUR\b/);
});

test.describe("the print route", () => {
  // The print tree has no client components by design, so it must render whole
  // with scripting off. That is the constraint server-side PDF depends on
  // (docs/adr/0002-print-first-pdf.md), and this is what actually enforces it.
  test.use({ javaScriptEnabled: false });

  test("renders the whole report without client JavaScript", async ({ page }) => {
    await page.goto(`/de/report/${reportId}/print`);

    await expect(page.getByRole("heading", { name: "Migrationsplan" })).toBeVisible();
    for (const title of [
      "Empfohlener Zielaufbau",
      "Migrationsfahrplan",
      "Bereitschaft und Kapazität",
      "Lokale KI",
      "Nächste Schritte",
    ]) {
      await expect(page.getByRole("heading", { name: title })).toBeVisible();
    }

    const text = await page.locator("article").innerText();
    expect(text).not.toMatch(/€|\bEUR\b/);
  });
});
