import { expect, test } from "@playwright/test";

const WIDTHS = [1440, 1024, 390] as const;
const THEMES = ["light", "dark"] as const;

test.describe("p3 screenshots", () => {
  test("home and catalog, light and dark", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "one set of reference shots");
    test.setTimeout(120_000);
    await page.emulateMedia({ reducedMotion: "reduce" });

    for (const theme of THEMES) {
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 });
        await page.addInitScript((value) => {
          localStorage.setItem("fagor-theme", value);
        }, theme);
        await page.goto("/uk");
        await page.evaluate((value) => {
          document.documentElement.setAttribute("data-theme", value);
        }, theme);
        await expect(page.locator('[data-lineup-ready="true"]')).toBeVisible();
        await page.screenshot({
          path: `docs/qa/p3/home-${theme}-${width}.png`,
        });

        await page.goto("/uk/catalog");
        await expect(page.getByRole("heading", { level: 1, name: "Каталог" })).toBeVisible();
        await page.screenshot({
          path: `docs/qa/p3/catalog-${theme}-${width}.png`,
        });
      }
    }
  });
});
