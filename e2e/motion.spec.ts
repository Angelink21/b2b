import { expect, test } from "@playwright/test";

test.describe("motion reduced", () => {
  test.use({ reducedMotion: "reduce" });

  test("home lineup works without motion", async ({ page }) => {
    await page.goto("/uk");
    await expect(page.locator('[data-lineup-ready="true"]')).toBeVisible({
      timeout: 15_000,
    });
    const output = page.locator(".lineup-output");
    await expect(output).toBeVisible();
    const ranges = page.locator(".lineup-ruler input[type=range]");
    await expect(ranges).toHaveCount(2);
    await expect(ranges.nth(0)).toBeEnabled();
  });
});

test.describe("lineup intro frames", () => {
  test("captures load scene frames", async ({ page }, testInfo) => {
    await page.addInitScript(() => {
      try {
        sessionStorage.removeItem("fagor-lineup-intro-played");
      } catch {
        // ignore
      }
    });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/uk");

    const stage = page.locator(".lineup-stage");
    await expect(stage).toBeVisible();

    const started = Date.now();
    const times = [0, 200, 600, 1200] as const;
    for (const ms of times) {
      const wait = ms - (Date.now() - started);
      if (wait > 0) {
        await page.waitForTimeout(wait);
      }
      await stage.screenshot({
        path: testInfo.outputPath(`lineup-intro-${ms}ms.png`),
      });
    }

    await expect(page.locator('[data-lineup-ready="true"]')).toBeVisible();
  });
});
