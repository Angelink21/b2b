import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const PAGES = ["about", "service", "contacts"] as const;

async function setTheme(
  page: import("@playwright/test").Page,
  theme: "light" | "dark",
) {
  await page.evaluate((value) => {
    localStorage.setItem("fagor-theme", value);
    document.documentElement.setAttribute("data-theme", value);
  }, theme);
  await page.reload();
}

test.describe("company pages P4", () => {
  for (const locale of ["uk", "en"] as const) {
    for (const pageName of PAGES) {
      test(`${locale}/${pageName} opens and is accessible`, async ({ page }) => {
        await page.goto(`/${locale}/${pageName}`);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        const results = await new AxeBuilder({ page }).analyze();
        expect(results.violations).toEqual([]);
      });
    }
  }

  test("service form submits with console sink", async ({ page }) => {
    await page.goto("/uk/service");
    const form = page.locator("form.quote-form").first();
    await expect(form).toBeVisible();

    await form.locator('input[name="name"]').fill("Service User");
    await form.locator('input[name="contact"]').fill("service@example.com");
    await form.locator('textarea[name="comment"]').fill("Drum noise on spin");
    await form.locator('input[name="consent"]').check();
    await form.getByRole("button", { name: /Надіслати|Send/i }).click();

    const success = page.getByRole("status");
    await expect(success).toBeVisible({ timeout: 15_000 });
    await expect(success).toContainText(/Запит прийнято|Request received/i);
  });

  test("contacts form submits with console sink", async ({ page }) => {
    await page.goto("/uk/contacts");
    const form = page.locator("form.quote-form").first();
    await expect(form).toBeVisible();

    await form.locator('input[name="name"]').fill("Contact User");
    await form.locator('input[name="contact"]').fill("contact@example.com");
    await form.locator('select[name="intent"]').selectOption("other");
    await form.locator('input[name="consent"]').check();
    await form.getByRole("button", { name: /Надіслати|Send/i }).click();

    const success = page.getByRole("status");
    await expect(success).toBeVisible({ timeout: 15_000 });
    await expect(success).toContainText(/прийнято|received/i);
  });

  test("sitemap XML includes about, service, contacts", async ({
    request,
  }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.ok()).toBeTruthy();
    const xml = await res.text();
    expect(xml).toContain("/about");
    expect(xml).toContain("/service");
    expect(xml).toContain("/contacts");
  });

  for (const pageName of PAGES) {
    for (const theme of ["light", "dark"] as const) {
      test(`screenshot ${pageName} ${theme} 1440`, async ({
        page,
      }, testInfo) => {
        test.skip(testInfo.project.name !== "chromium", "desktop chrome only");
        await page.goto(`/uk/${pageName}`);
        await setTheme(page, theme);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

        const dir = path.join("docs", "qa", "p4");
        fs.mkdirSync(dir, { recursive: true });
        const file = path.join(dir, `${pageName}-${theme}-1440.png`);
        await page.screenshot({ path: file, fullPage: true });
      });

      test(`screenshot ${pageName} ${theme} 390`, async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== "mobile", "mobile project only");
        await page.goto(`/uk/${pageName}`);
        await setTheme(page, theme);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

        const dir = path.join("docs", "qa", "p4");
        fs.mkdirSync(dir, { recursive: true });
        const file = path.join(dir, `${pageName}-${theme}-390.png`);
        await page.screenshot({ path: file, fullPage: true });
      });
    }
  }
});
