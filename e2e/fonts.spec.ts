import { expect, test } from "@playwright/test";

test("cyrillic glyphs in Spectral and Source Sans 3", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "screenshot once on chromium");
  await page.goto("/uk/fontcheck");
  await expect(page.getByRole("main")).toHaveScreenshot("font-glyphs-uk.png", {
    maxDiffPixelRatio: 0.02,
  });
});
