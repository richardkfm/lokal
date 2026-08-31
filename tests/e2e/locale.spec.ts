import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { persona } from "../fixtures/personas";
import en from "../../messages/en.json";

/**
 * The English build, proved to actually be in English.
 *
 * Until this spec, English was verified only structurally: `tests/i18n` asserts
 * the two catalogues have identical key paths and no empty values, and
 * `tests/report/to-markdown.test.ts` renders English Markdown through a strict
 * translator. Both are worth having and neither can see a string that never went
 * through the catalogue at all.
 *
 * Two such strings shipped. The wizard's progress landmark was
 * `aria-label="Fortschritt"` and the readiness meter's accessible name ended
 * `${score} von 100`, both written inline in TSX. Neither is visible on screen,
 * so a design pass, an accessibility pass and a copy pass all missed them — and
 * an axe run would not have flagged either, because a German accessible name on
 * an English page is a perfectly valid accessible name.
 *
 * What catches that class of bug is asserting the property directly: on an
 * English page, no German. Including in the places only a screen reader reaches.
 *
 * This scan catches German *sentences* and anything carrying an umlaut, which is
 * what a message value left untranslated or a rulepack string falling back to
 * German looks like. It cannot catch a single German noun with no umlaut —
 * "Fortschritt" passes it cleanly, which was verified rather than assumed. That
 * half is covered statically by the `lokal/no-hardcoded-accessible-names` lint
 * rule in `eslint.config.mjs`, which bans the literal at the point it is typed.
 * The two guards are complementary and neither is sufficient alone.
 */

/**
 * German markers.
 *
 * Umlauts plus a short stopword list. The stopwords are the load-bearing half —
 * "Progress" and "Fortschritt" share no umlaut, but German function words are
 * unavoidable in any real German sentence and near-absent from English ones.
 * `von` is deliberately included: it is what the meter bug said.
 */
const GERMAN =
  /[äöüßÄÖÜ]|\b(und|oder|nicht|Sie|Ihre|Ihrer|werden|wird|kann|können|mit|für|von|der|die|das|dem|den|eine|einen|einem|auch|noch|sind|ist|bei|aus|nach|über|unter|zwischen|Arbeitsplätze|Bereich|Bereiche)\b/;

/**
 * A message key that leaked instead of a translation, e.g. `report.glance.title`.
 *
 * Anchored to the catalogue's own top-level namespaces rather than to "looks
 * dotted". The looser version flagged
 * `https://www.microsoft.com/de-de/microsoft-365/...` — a source URL the report
 * is supposed to print, and exactly the kind of false positive that gets a
 * useful assertion deleted rather than fixed.
 */
const RAW_KEY = new RegExp(
  `\\b(?:${Object.keys(en).join("|")})(?:\\.[a-zA-Z0-9_]+){2,}\\b`,
);

/**
 * Everything a reader or a screen reader can get at: rendered text plus the
 * accessible names that never appear on screen. The second half is the point —
 * both bugs this spec exists for lived exclusively there.
 */
async function readableText(page: Page): Promise<string> {
  return page.evaluate(() => {
    const body = document.body.innerText;
    const names = [...document.querySelectorAll("[aria-label]")]
      .map((element) => element.getAttribute("aria-label") ?? "")
      .join(" \n");
    const titles = [...document.querySelectorAll("[title]")]
      .map((element) => element.getAttribute("title") ?? "")
      .join(" \n");
    return [body, names, titles].join(" \n");
  });
}

function assertEnglish(text: string, surface: string) {
  const offenders = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && GERMAN.test(line));

  expect(
    offenders,
    `German on the English ${surface}:\n${offenders.join("\n")}`,
  ).toEqual([]);
}

/**
 * An assessment whose free text is English.
 *
 * The report echoes what the user typed — department names, free-text tool names
 * — and those stay in whatever language they were entered in, correctly. Seeding
 * with the German municipality persona would flag "Bürgerbüro" as a defect when
 * it is the user's own word. Overriding the free text is what makes the
 * remaining German unambiguous evidence of a bug.
 */
function englishAssessment() {
  const base = persona("municipality-180").input;
  return {
    ...base,
    locale: "en" as const,
    org: {
      ...base.org,
      departments: ["Planning", "Registry", "Finance", "Public order"],
    },
  };
}

let reportId = "";

test.beforeAll(async ({ request }) => {
  const response = await request.post("/api/assessments", {
    data: englishAssessment(),
  });
  expect(response.status()).toBe(201);
  reportId = ((await response.json()) as { id: string }).id;
});

const surfaces = () => [
  { name: "landing page", path: "/en" },
  { name: "wizard", path: "/en/assessment" },
  { name: "report", path: `/en/report/${reportId}` },
  { name: "print route", path: `/en/report/${reportId}/print` },
];

for (const index of [0, 1, 2, 3]) {
  test(`the English build renders in English (${["landing", "wizard", "report", "print"][index]})`, async ({
    page,
  }) => {
    const surface = surfaces()[index]!;
    await page.goto(surface.path);

    const text = await readableText(page);
    assertEnglish(text, surface.name);

    // A missing key renders as its own path, which is worse than a German
    // sentence: it is unreadable in either language.
    const leaked = text.split("\n").filter((line) => RAW_KEY.test(line.trim()));
    expect(leaked, `Raw message keys on the English ${surface.name}`).toEqual([]);
  });
}

/**
 * A report taken in German, read in English.
 *
 * The suite's own fixture stores `locale: "en"`, which is why this passed
 * throughout v0.1.0 while `/en/report/<id>` served German prose for every
 * report a German respondent had actually produced: the view read the *stored*
 * locale, so a fixture stored in English could never expose it. Any real
 * English reader arrives at a German-taken report — that is what the locale
 * switch in the header does.
 *
 * The free text is English so the only German that can appear is the kind that
 * comes from the rulepack, which is precisely what was leaking.
 */
test("a German-taken report reads in English at /en", async ({ page, request }) => {
  const response = await request.post("/api/assessments", {
    data: { ...englishAssessment(), locale: "de" },
  });
  expect(response.status()).toBe(201);
  const germanTaken = ((await response.json()) as { id: string }).id;

  await page.goto(`/en/report/${germanTaken}`);
  assertEnglish(await readableText(page), "report taken in German");

  await page.goto(`/en/report/${germanTaken}/print`);
  assertEnglish(await readableText(page), "printed report taken in German");

  // And the same report still reads in German where German was asked for.
  await page.goto(`/de/report/${germanTaken}`);
  const german = await page.locator("body").innerText();
  expect(german).toMatch(/Dateiablage mit Synchronisation/);
});

test("the English report reaches the reader in English", async ({ page }) => {
  await page.goto(`/en/report/${reportId}`);

  await expect(page.getByRole("heading", { name: en.report.title })).toBeVisible();
  // The savings section is where phase 6's figures live, so it is the part most
  // recently written and least exercised in English.
  await expect(
    page.getByRole("heading", { name: en.report.savings.title }),
  ).toBeVisible();
  await expect(page.getByText(en.report.savings.exposureTitle)).toBeVisible();

  // ADR-0003 guardrail 3 is a property of the document, not of German.
  const body = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  expect(body).toContain("€");
  expect(body).toMatch(/per seat per month/);
  expect(body).toMatch(/observed \d{1,2} \p{L}+ \d{4}/u);
  expect(body).toMatch(/Evidenced for \d+ of \d+ assessed areas/);
});

/**
 * The BITV 2.0 gate, in the other language.
 *
 * Structural accessibility is largely locale-independent, but "largely" is not
 * "entirely": a translation long enough to overflow its control, or one that
 * leaves a control without an accessible name, shows up here and nowhere else.
 */
test("the English surfaces pass the accessibility bar", async ({ page }) => {
  for (const surface of surfaces()) {
    await page.goto(surface.path);

    await page.evaluate(() => {
      for (const animation of document.getAnimations()) {
        if (animation.effect?.getComputedTiming().iterations === Infinity) {
          animation.pause();
          animation.currentTime = 0;
        } else {
          animation.finish();
        }
      }
    });

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const blocking = results.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact ?? ""),
    );

    expect(
      blocking.map(
        (violation) => `${surface.name}: ${violation.id} — ${violation.help}`,
      ),
    ).toEqual([]);
  }
});
