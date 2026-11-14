import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const LOCALES = ["uk", "en"] as const;
const THEMES = ["light", "dark"] as const;

async function setTheme(
  page: import("@playwright/test").Page,
  theme: "light" | "dark",
) {
  await page.evaluate((t) => {
    localStorage.setItem("fagor-theme", t);
    document.documentElement.setAttribute("data-theme", t);
  }, theme);
  await page.reload();
}

test.describe("styleguide", () => {
  for (const locale of LOCALES) {
    for (const theme of THEMES) {
      test(`axe ${locale} ${theme}`, async ({ page }) => {
        await page.goto(`/${locale}/_styleguide`);
        await setTheme(page, theme);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

        const results = await new AxeBuilder({ page }).analyze();
        expect(results.violations).toEqual([]);
      });
    }
  }

  test("section screenshots light 1440", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "desktop chrome only");
    await page.goto("/uk/_styleguide");
    await setTheme(page, "light");

    for (const section of ["buttons", "chips", "fields", "silhouette", "drawing"] as const) {
      const loc = page.locator(`[data-sg="${section}"]`);
      await expect(loc).toBeVisible();
      await expect(loc).toHaveScreenshot(`sg-${section}-light-1440.png`, {
        maxDiffPixelRatio: 0.03,
      });
    }
  });

  test("full page light/dark 1440 and 390", async ({ page }, testInfo) => {
    const project = testInfo.project.name;
    test.skip(
      project !== "chromium" && project !== "mobile",
      "chromium 1440 + mobile 390 only",
    );

    const size = project === "mobile" ? "390" : "1440";

    for (const theme of THEMES) {
      await page.goto("/uk/_styleguide");
      await setTheme(page, theme);
      await expect(page.getByRole("main")).toHaveScreenshot(
        `styleguide-${theme}-${size}.png`,
        { fullPage: true, maxDiffPixelRatio: 0.04 },
      );
    }
  });
});
