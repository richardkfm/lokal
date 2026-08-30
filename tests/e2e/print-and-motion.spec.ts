import { expect, test, type Page } from "@playwright/test";
import { persona } from "../fixtures/personas";

/**
 * The two ways motion has broken this project, pinned so they cannot come back.
 *
 * Phase 5.5 shipped `animation-timeline: view()` reveals and the landing page
 * came out of the printer nearly blank: paper has no scroll position, so the
 * timeline never advanced and every revealed block printed at opacity 0. The
 * reduced-motion guard did not catch it, because a visitor can prefer motion and
 * still hit Print.
 *
 * Phase 6 added three more effects, one of which now appears on the printed
 * brief itself. So the resting frame — what shows with no animation running — is
 * asserted directly rather than left to review. Every effect in `globals.css` is
 * built so that frame is the readable one; this is what proves it stayed that
 * way.
 *
 * These run under emulated media rather than a real print, which is the only
 * thing Playwright can do and is also exactly where the bug lived: the computed
 * styles under `@media print` are what the PDF renderer reads.
 */

async function animationState(page: Page, selector: string) {
  return page.$$eval(selector, (elements) =>
    elements.map((element) => {
      const style = getComputedStyle(element);
      return {
        opacity: Number(style.opacity),
        animationName: style.animationName,
        text: element.textContent?.trim() ?? "",
      };
    }),
  );
}

/** Nothing animated may rest invisible, and a cycling group rests on one word. */
async function expectLegibleAtRest(page: Page) {
  const words = await animationState(page, ".word-cycle > *");
  if (words.length > 0) {
    const visible = words.filter((word) => word.opacity > 0);
    expect(visible).toHaveLength(1);
    // The lead word is the resting word, so the sentence reads correctly.
    expect(words[0]?.opacity).toBe(1);
    expect(words[0]?.animationName).toBe("none");
  }

  for (const dot of await animationState(page, ".path-dot")) {
    expect(dot.animationName).toBe("none");
    expect(dot.opacity).toBeGreaterThan(0.5);
  }

  for (const seal of await animationState(page, ".spin-seal")) {
    expect(seal.animationName).toBe("none");
  }

  // The regression that actually shipped once.
  const reveals = await page.$$eval(".reveal", (elements) =>
    elements.map((element) => Number(getComputedStyle(element).opacity)),
  );
  for (const opacity of reveals) expect(opacity).toBe(1);
}

let reportId = "";

test.beforeAll(async ({ request }) => {
  const response = await request.post("/api/assessments", {
    data: persona("municipality-180").input,
  });
  expect(response.status()).toBe(201);
  reportId = ((await response.json()) as { id: string }).id;
});

test("the landing page prints with nothing hidden", async ({ page }) => {
  await page.goto("/de");
  await page.emulateMedia({ media: "print" });
  await expectLegibleAtRest(page);
});

test("the landing page is legible under reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/de");
  await expectLegibleAtRest(page);
});

test("the printed report shows no frozen-out content", async ({ page }) => {
  await page.goto(`/de/report/${reportId}/print`);
  await page.emulateMedia({ media: "print" });
  await expectLegibleAtRest(page);

  // Site chrome stays off the printed brief. This is what `data-site-chrome`
  // exists for, and nothing else catches it.
  const chrome = await page.$$eval("[data-site-chrome]", (elements) =>
    elements.map((element) => getComputedStyle(element).display),
  );
  for (const display of chrome) expect(display).toBe("none");
});

/**
 * ADR-0003 guardrail 3, checked where it matters most.
 *
 * The printed brief is the copy that gets forwarded to a council or a management
 * board, read by someone who was not in the room. A euro figure that reaches
 * them without the plan name, source and date behind it is one they cannot check
 * and should not trust.
 */
test("every printed euro figure carries its basis", async ({ page }) => {
  await page.goto(`/de/report/${reportId}/print`);
  await page.emulateMedia({ media: "print" });

  // innerText is the rendered text, so this reflects `text-transform` too.
  const body = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  expect(body).toContain("€");

  expect(body).toMatch(/Rechengrundlage/i);
  expect(body).toMatch(/je Arbeitsplatz und Monat/);
  expect(body).toMatch(/erhoben am \d{4}-\d{2}-\d{2}/);
  expect(body).toMatch(/Belegt für \d+ von \d+ betrachteten Bereichen/);
  expect(body).toMatch(/https:\/\/\S+/);

  // The claims lokal must never make, on paper least of all.
  expect(body).not.toMatch(/\bROI\b/i);
  expect(body).not.toMatch(/Amortisation|Kapitalrendite/i);
});
