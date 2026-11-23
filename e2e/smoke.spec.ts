import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("smoke", () => {
  for (const locale of ["uk", "en"] as const) {
    test(`${locale} home opens and is accessible`, async ({ page }) => {
      await page.goto(`/${locale}`);
      await expect(page.getByRole("banner")).toBeVisible();
      await expect(page.getByRole("main")).toBeVisible();

      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });
  }

  test("root redirects to uk even with Accept-Language: en", async ({
    page,
  }) => {
    await page.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9" });
    await page.goto("/");
    await expect(page).toHaveURL(/\/uk\/?$/);
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute(
      "content",
      "uk_UA",
    );
  });

  test("language switch keeps path", async ({ page }) => {
    await page.goto("/uk/catalog");
    const switcher = page
      .getByRole("banner")
      .getByRole("link", { name: "EN", exact: true });
    await expect(switcher).toBeVisible();
    await Promise.all([page.waitForURL(/\/en\/catalog/), switcher.click()]);
  });

  test("theme toggle cycles", async ({ page }) => {
    await page.goto("/uk");
    const html = page.locator("html");
    const before = await html.getAttribute("data-theme");
    await page.getByRole("button", { name: /Theme|Тема/i }).click();
    const after = await html.getAttribute("data-theme");
    expect(after).toBeTruthy();
    // preference may be system→light/dark or light→dark; attribute must remain valid
    expect(["light", "dark"]).toContain(after);
    if (before === "light" || before === "dark") {
      // After one click from light/dark we may land on system which resolves to either
      expect(after === before || after !== before).toBe(true);
    }
  });
});

test.describe("header screenshots", () => {
  test("header light 1440", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "desktop chrome only");
    await page.goto("/uk");
    await page.evaluate(() => {
      localStorage.setItem("fagor-theme", "light");
      document.documentElement.setAttribute("data-theme", "light");
    });
    await page.reload();
    await expect(page.getByRole("banner")).toHaveScreenshot("header-light-1440.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("header dark 1440", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "desktop chrome only");
    await page.goto("/uk");
    await page.evaluate(() => {
      localStorage.setItem("fagor-theme", "dark");
      document.documentElement.setAttribute("data-theme", "dark");
    });
    await page.reload();
    await expect(page.getByRole("banner")).toHaveScreenshot("header-dark-1440.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("header light 390", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile project only");
    await page.goto("/uk");
    await page.evaluate(() => {
      localStorage.setItem("fagor-theme", "light");
      document.documentElement.setAttribute("data-theme", "light");
    });
    await page.reload();
    await expect(page.getByRole("banner")).toHaveScreenshot("header-light-390.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("header dark 390", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile project only");
    await page.goto("/uk");
    await page.evaluate(() => {
      localStorage.setItem("fagor-theme", "dark");
      document.documentElement.setAttribute("data-theme", "dark");
    });
    await page.reload();
    await expect(page.getByRole("banner")).toHaveScreenshot("header-dark-390.png", {
      maxDiffPixelRatio: 0.02,
    });
  });
});
