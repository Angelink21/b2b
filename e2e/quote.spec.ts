import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

async function setTheme(
  page: import("@playwright/test").Page,
  theme: "light" | "dark",
) {
  await page.goto("/uk/quote");
  await page.evaluate((value) => {
    localStorage.setItem("fagor-theme", value);
    document.documentElement.setAttribute("data-theme", value);
  }, theme);
  await page.reload();
}

test.describe("quote form", () => {
  test("validation errors keep values and axe is clean", async ({ page }) => {
    await page.goto("/uk/quote");
    const form = page.locator("form.quote-form").first();
    await expect(form).toBeVisible();

    await form.getByLabel(/Компанія|Company/i).fill("Test Co");
    await form.getByRole("button", { name: /Надіслати|Send/i }).click();

    await expect(form.getByRole("alert").first()).toBeVisible();
    await expect(form.getByLabel(/Компанія|Company/i)).toHaveValue("Test Co");

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test("prefill from URL and successful submit", async ({ page }) => {
    await page.goto(
      "/uk/quote?kg=40&sector=hospitals&m=lap-08-tp2-e-v",
    );
    const form = page.locator("form.quote-form").first();
    await expect(form).toBeVisible();

    await expect(form.locator('input[name="kgPerShift"]')).toHaveValue("40");
    await expect(form.locator('select[name="sector"]')).toHaveValue(
      "hospitals",
    );
    await expect(form.getByRole("listitem")).toHaveCount(1);

    await form.locator('input[name="name"]').fill("Test User");
    await form
      .locator('input[name="contact"]')
      .fill("buyer@example.com");
    await form.locator('input[name="consent"]').check();

    await form.getByRole("button", { name: /Надіслати|Send/i }).click();

    const success = page.getByRole("status");
    await expect(success).toBeVisible({ timeout: 15_000 });
    await expect(success).toContainText(/Запит прийнято|Request received/i);
  });

  for (const theme of ["light", "dark"] as const) {
    test(`screenshots ${theme}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "chromium", "desktop chrome only");
      await setTheme(page, theme);
      const form = page.locator("form.quote-form").first();
      await expect(form).toBeVisible();
      await expect(form).toHaveScreenshot(`quote-empty-${theme}.png`, {
        maxDiffPixelRatio: 0.03,
      });

      await form.getByRole("button", { name: /Надіслати|Send/i }).click();
      await expect(form.getByRole("alert").first()).toBeVisible();
      await expect(form).toHaveScreenshot(`quote-error-${theme}.png`, {
        maxDiffPixelRatio: 0.03,
      });

      await form.locator('input[name="name"]').fill("Test User");
      await form.locator('input[name="contact"]').fill("buyer@example.com");
      await form.locator('input[name="consent"]').check();
      await form.getByRole("button", { name: /Надіслати|Send/i }).click();
      const success = page.getByRole("status");
      await expect(success).toBeVisible({ timeout: 15_000 });
      await expect(success).toHaveScreenshot(`quote-success-${theme}.png`, {
        maxDiffPixelRatio: 0.03,
      });
    });
  }
});
