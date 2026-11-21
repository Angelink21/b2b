import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

async function openSearchViaButton(page: import("@playwright/test").Page) {
  const btn = page.getByRole("button", { name: "Пошук моделей" });
  await expect(btn).toBeVisible();
  await expect(async () => {
    if ((await btn.getAttribute("aria-expanded")) === "true") return;
    await btn.click({ timeout: 2_000 });
    await expect(btn).toHaveAttribute("aria-expanded", "true", { timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
  await expect(page.getByRole("dialog", { name: "Пошук моделей" })).toBeVisible();
}

test.describe("global search", () => {
  test("opens with keyboard and finds LA-28", async ({ page }) => {
    await page.goto("/uk", { waitUntil: "networkidle" });
    const btn = page.getByRole("button", { name: "Пошук моделей" });
    await expect(btn).toBeVisible();
    await expect(async () => {
      await page.locator("body").press("Control+K");
      await expect(btn).toHaveAttribute("aria-expanded", "true", { timeout: 1_000 });
    }).toPass({ timeout: 15_000 });
    await expect(page.getByRole("dialog", { name: "Пошук моделей" })).toBeVisible();
    await page.getByRole("searchbox").fill("LA-28");
    const hit = page.getByRole("option", { name: /LA-28/i }).first();
    await expect(hit).toBeVisible({ timeout: 15_000 });
    await hit.click();
    await expect(page).toHaveURL(/\/uk\/catalog\/washers\/[^/]+/);
    await expect(
      page.getByRole("heading", { level: 1, name: /LA-28/i }),
    ).toBeVisible();
  });

  test("opens with slash shortcut", async ({ page }) => {
    await page.goto("/uk/catalog", { waitUntil: "networkidle" });
    const btn = page.getByRole("button", { name: "Пошук моделей" });
    await expect(btn).toBeVisible();
    await expect(async () => {
      await page.locator("body").press("/");
      await expect(btn).toHaveAttribute("aria-expanded", "true", { timeout: 1_000 });
    }).toPass({ timeout: 15_000 });
    await expect(page.getByRole("dialog", { name: "Пошук моделей" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Пошук моделей" })).toHaveCount(0);
  });

  test("passes axe when open", async ({ page }) => {
    await page.goto("/uk/catalog", { waitUntil: "networkidle" });
    await openSearchViaButton(page);
    const results = await new AxeBuilder({ page })
      .include(".search-dialog")
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
