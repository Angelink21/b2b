import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("catalog", () => {
  test("deep link filters and opens model then quote", async ({ page }) => {
    await page.goto("/uk/catalog?kg=20-40&type=washers");

    await expect(
      page.getByRole("heading", { level: 1, name: "Каталог" }),
    ).toBeVisible();

    const washersChip = page.getByRole("button", { name: "Пральні машини" });
    await expect(washersChip).toHaveAttribute("aria-pressed", "true");

    const firstLink = page.locator(".catalog-model-link").first();
    await expect(firstLink).toBeVisible({ timeout: 10_000 });
    const modelName = (await firstLink.innerText()).trim();
    await firstLink.click();

    await expect(page).toHaveURL(/\/uk\/catalog\/washers\/[^/?]+/);
    await expect(
      page.getByRole("heading", { level: 1, name: modelName }),
    ).toBeVisible();

    const quote = page.getByRole("link", { name: /Отримати КП на цю модель/i });
    await expect(quote).toHaveAttribute("href", /m=/);
    await quote.click();
    await expect(page).toHaveURL(/\/uk\/quote\?m=/);
  });

  test("category page is static-filtered", async ({ page }) => {
    await page.goto("/uk/catalog/dryers");
    await expect(
      page.getByRole("heading", { level: 1, name: "Сушильні машини" }),
    ).toBeVisible();
    await expect(page.locator(".catalog-model-link").first()).toBeVisible();
  });

  test("catalog and model are accessible (axe)", async ({ page }) => {
    await page.goto("/uk/catalog?type=washers");
    const catalogAxe = await new AxeBuilder({ page }).analyze();
    expect(catalogAxe.violations).toEqual([]);

    const firstLink = page.locator(".catalog-model-link").first();
    await firstLink.click();
    await expect(page.getByRole("heading", { level: 1 })).not.toHaveText(
      /Щось пішло не так|Something went wrong/i,
    );
    const modelAxe = await new AxeBuilder({ page }).analyze();
    expect(modelAxe.violations).toEqual([]);
  });
});
