import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { persona } from "../fixtures/personas";

/** axe's own violation type, taken from the builder rather than re-declared. */
type Violation = Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"][number];

/**
 * Accessibility pass over the four surfaces that ship.
 *
 * Not decoration for this audience. German public bodies procure against
 * BITV 2.0, and a tool that argues for open, sovereign software while shipping a
 * form nobody can operate with a keyboard has lost the argument before anyone
 * reads the plan it produced.
 *
 * The bar is serious and critical impacts. Minor and moderate findings are
 * recorded by the run but do not fail it — a hard gate at that level turns into
 * a suppression list, which is worse than no gate at all.
 */

const BLOCKING = new Set(["serious", "critical"]);

/** Ruleset: WCAG 2.1 A and AA, which is what BITV 2.0 refers to. */
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function violations(page: Page): Promise<Violation[]> {
  // The stepper and the choice cards animate their colours on change, and axe
  // samples whatever colour it finds at that instant — mid-transition that is a
  // value no user ever sees, and the contrast check fails on it at random.
  // Snapping animations to their end state makes the measurement deterministic.
  //
  // The hero's ambient background loops forever, and an animation with no end
  // has no end state to snap to: `finish()` throws InvalidStateError on one.
  // Pausing it at a fixed time gives the same guarantee this helper exists for
  // — every run samples the identical frame.
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

  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  return results.violations;
}

function describeViolations(found: Violation[]): string {
  return found
    .map(
      (violation) =>
        `${violation.id} (${violation.impact}): ${violation.help}\n` +
        violation.nodes.map((node) => `    ${node.target.join(" ")}`).join("\n"),
    )
    .join("\n");
}

async function expectAccessible(page: Page) {
  const found = await violations(page);
  const blocking = found.filter((v) => BLOCKING.has(v.impact ?? ""));

  // The full list is attached either way, so a moderate finding stays visible
  // to whoever reads the run rather than being quietly dropped.
  if (found.length > 0) {
    await test.info().attach(`axe — ${new URL(page.url()).pathname}`, {
      body: describeViolations(found),
      contentType: "text/plain",
    });
  }

  expect(blocking, describeViolations(blocking)).toEqual([]);
}

/**
 * A report to inspect.
 *
 * Seeded through the API with a canonical persona rather than by driving the
 * wizard: the smoke test already proves the wizard reaches this endpoint, and
 * re-running a full intake here would double the suite's runtime to produce the
 * same row in the database.
 */
let reportId = "";

test.beforeAll(async ({ request }) => {
  const response = await request.post("/api/assessments", {
    data: persona("municipality-180").input,
  });
  expect(response.status()).toBe(201);
  reportId = ((await response.json()) as { id: string }).id;
});

test("the landing page is accessible", async ({ page }) => {
  await page.goto("/de");
  await expectAccessible(page);
});

test("the wizard is accessible on every step", async ({ page }) => {
  await page.goto("/de/assessment");

  // Step one, before anything is answered: the state a first-time visitor sees.
  await expectAccessible(page);

  // The remaining steps need valid answers to unlock, so the wizard is filled
  // from the same persona rather than clicked through blind.
  await page.locator('label:has(input[name="orgType"][value="municipality"])').click();
  await page.getByLabel("Arbeitsplätze insgesamt").fill("180");
  await page.getByRole("button", { name: "Weiter" }).click();

  await expect(
    page.getByRole("heading", { name: "Betrieb und Kapazitäten" }),
  ).toBeVisible();
  await expectAccessible(page);

  for (const [name, value] of [
    ["hostingPreference", "self_hosted"],
    ["linuxCapability", "basic"],
    ["adminCapacity", "low"],
    ["itMaturity", "medium"],
    ["identityMaturity", "medium"],
    ["supportExpectation", "vendor_support_needed"],
  ] as const) {
    await page.locator(`label:has(input[name="${name}"][value="${value}"])`).click();
  }
  await page.getByRole("button", { name: "Weiter" }).click();

  await expect(
    page.getByRole("heading", { name: "Welche Bereiche betrachten wir?" }),
  ).toBeVisible();
  await expectAccessible(page);

  await page
    .locator('label:has(input[name="categories"][value="office_docs"])')
    .click();
  await page.getByRole("button", { name: "Weiter" }).click();

  // The detail step is the longest page in the wizard and the one that repeats
  // the same three-point question five times over. If any step is going to have
  // an unlabelled control, it is this one.
  await expect(page.getByRole("heading", { name: "Angaben je Bereich" })).toBeVisible();
  await expectAccessible(page);

  // Every repeated group names the question it answers.
  const block = page.getByRole("region", { name: "Office und Dokumente" });
  for (const legend of [
    "Betriebskritikalität",
    "Leidensdruck",
    "Sorge vor Abhängigkeit",
    "Schulungsempfindlichkeit",
    "Dringlichkeit",
  ]) {
    await expect(block.getByRole("group", { name: legend })).toBeVisible();
  }
});

test("the report is accessible", async ({ page }) => {
  await page.goto(`/de/report/${reportId}`);
  await expect(page.getByRole("heading", { name: "Migrationsplan" })).toBeVisible();
  await expectAccessible(page);
});

test("the print route is accessible", async ({ page }) => {
  await page.goto(`/de/report/${reportId}/print`);
  await expect(page.getByRole("heading", { name: "Migrationsplan" })).toBeVisible();
  await expectAccessible(page);
});

test("the wizard is operable by keyboard alone", async ({ page }) => {
  await page.goto("/de/assessment");

  // The skip link is the first stop, and it has to become visible when focused
  // — a skip link nobody can see is a skip link nobody uses.
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Zum Inhalt springen" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();

  // Tab into the first radio group and answer it without touching the mouse.
  const firstOption = page.locator('input[name="orgType"][value="sme"]');
  await firstOption.focus();
  await page.keyboard.press("Space");
  await expect(firstOption).toBeChecked();

  // Arrow keys move within a radio group, which is what makes the card layout
  // usable rather than merely present.
  await page.keyboard.press("ArrowDown");
  await expect(
    page.locator('input[name="orgType"][value="municipality"]'),
  ).toBeChecked();
});
