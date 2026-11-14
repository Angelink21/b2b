import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import path from "node:path";

const SLUGS = ["lap-08-tp2-e-v", "lap-08-tp2-e-p", "lap-08-tp2-hw-v"] as const;

test.describe("compare and datasheet", () => {
  test("add three models, compare, remove one", async ({ page }) => {
    await page.goto("/uk/catalog?type=washers");

    await expect(
      page.getByRole("button", { name: "Порівняти" }).first(),
    ).toBeVisible({ timeout: 10_000 });

    for (let i = 0; i < 3; i += 1) {
      await page.getByRole("button", { name: "Порівняти" }).first().click();
    }

    const tray = page.getByRole("region", { name: "Панель порівняння" });
    await expect(tray).toBeVisible();
    await expect(tray.getByText(/3 модел/)).toBeVisible();

    await expect(page).toHaveURL(/[?&]m=/);
    const compareLink = tray.getByRole("link", { name: "Порівняти" });
    const href = await compareLink.getAttribute("href");
    expect(href).toMatch(/\/compare\?m=/);
    // Soft nav via fixed tray is flaky on WebKit; follow the tray href explicitly.
    await page.goto(href!);
    await expect(page).toHaveURL(/\/uk\/compare\?m=/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Порівняння моделей" }),
    ).toBeVisible();

    const table = page.locator(".compare-table");
    await expect(table).toBeVisible();
    await expect(table.locator("thead th")).toHaveCount(4);

    const removeFirst = table
      .locator("thead th")
      .nth(1)
      .getByRole("button", { name: /Прибрати/ });
    await removeFirst.click();

    await expect(table.locator("thead th")).toHaveCount(3);
    await expect(page).toHaveURL(/m=/);
  });

  test("deep link compare and quote", async ({ page }) => {
    const m = SLUGS.join(",");
    await page.goto(`/uk/compare?m=${encodeURIComponent(m)}`);
    await expect(page.locator(".compare-table")).toBeVisible();
    await expect(page.getByRole("button", { name: "Лише відмінності" })).toBeVisible();

    const quote = page.getByRole("link", { name: /Отримати КП на ці моделі/i });
    await expect(quote).toHaveAttribute("href", /m=/);
  });

  test("datasheet has fields and print preview", async ({ page }, testInfo) => {
    const slug = SLUGS[0];
    await page.goto(`/uk/catalog/washers/${slug}/datasheet`);

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator(".datasheet-sheet")).toBeVisible();
    await expect(page.locator(".datasheet-specs .spec-list").first()).toBeVisible();
    await expect(page.getByText("Завантаження, кг")).toBeVisible();
    await expect(page.getByText("Габарити, мм")).toBeVisible();
    await expect(page.locator(".datasheet-drawing svg")).toBeVisible();

    await expect(page.locator(".site-header")).toBeHidden();
    await expect(page.locator(".site-footer")).toBeHidden();

    await page.emulateMedia({ media: "print" });
    const shot = await page.screenshot({ fullPage: true });
    await testInfo.attach("datasheet-print", {
      body: shot,
      contentType: "image/png",
    });
    const out = path.join(
      testInfo.outputDir,
      "datasheet-print-preview.png",
    );
    await page.screenshot({ path: out, fullPage: true });

    const printBtn = page.getByRole("button", { name: /Друк \/ PDF/i });
    await expect(printBtn).toBeHidden();
  });

  test("compare and datasheet axe", async ({ page }) => {
    const m = SLUGS.slice(0, 2).join(",");
    await page.goto(`/uk/compare?m=${encodeURIComponent(m)}`);
    const compareAxe = await new AxeBuilder({ page }).analyze();
    expect(compareAxe.violations).toEqual([]);

    await page.goto(`/uk/catalog/washers/${SLUGS[0]}/datasheet`);
    const sheetAxe = await new AxeBuilder({ page }).analyze();
    expect(sheetAxe.violations).toEqual([]);
  });
});
