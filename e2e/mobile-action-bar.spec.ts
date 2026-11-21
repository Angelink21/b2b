import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const HIDE_ROUTES = ["/uk/quote", "/uk/contacts"] as const;

test.describe("mobile action bar", () => {
  for (const width of [390, 768]) {
    test(`visible at ${width}px on home`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/uk");
      const bar = page.getByRole("region", { name: "Швидкі дії" });
      await expect(bar).toBeVisible();
      await expect(
        bar.getByRole("link", { name: "Отримати КП", exact: true }),
      ).toBeVisible();
    });
  }

  for (const route of HIDE_ROUTES) {
    test(`hidden on ${route}`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 800 });
      await page.goto(route);
      await expect(
        page.getByRole("region", { name: "Швидкі дії" }),
      ).toHaveCount(0);
    });
  }

  test("axe on catalog mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto("/uk/catalog");
    await expect(
      page.getByRole("region", { name: "Швидкі дії" }),
    ).toBeVisible();
    const results = await new AxeBuilder({ page })
      .include(".mobile-action-bar")
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
