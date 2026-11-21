import { expect, test } from "@playwright/test";

async function openFiltersIfClosed(page: import("@playwright/test").Page) {
  await expect(page.locator('[data-filters-ready="true"]')).toBeVisible();
  const toggle = page.getByRole("button", { name: "Фільтри" });
  if (await toggle.isVisible()) {
    await toggle.click();
  }
}

test.describe("dimension filters", () => {
  test("w param filters washers", async ({ page }) => {
    await page.goto("/uk/catalog/washers?w=700");
    await openFiltersIfClosed(page);
    await expect(
      page.getByRole("button", { name: /ширина до.*700/i }),
    ).toBeVisible();
    const countText = await page.locator(".catalog-meta span").first().innerText();
    await page.goto("/uk/catalog/washers");
    await expect(page.locator('[data-filters-ready="true"]')).toBeVisible();
    const allText = await page.locator(".catalog-meta span").first().innerText();
    expect(countText).not.toEqual(allText);
  });

  test("drops w on categories without dimension matrix", async ({ page }) => {
    await page.goto("/uk/catalog?w=700");
    await expect(page).not.toHaveURL(/[?&]w=/);
  });
});