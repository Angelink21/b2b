import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function openFiltersIfClosed(page: Page) {
  await expect(page.locator('[data-filters-ready="true"]')).toBeVisible();
  const toggle = page.getByRole("button", { name: "Фільтри" });
  if (await toggle.isVisible()) {
    await toggle.click();
    await expect(page.getByRole("dialog", { name: "Фільтри" })).toBeVisible();
  }
}

test.describe("catalog", () => {
  test("deep link filters and opens model then quote", async ({ page }) => {
    await page.goto("/uk/catalog?kg=20-40&type=washers");
    await openFiltersIfClosed(page);

    await expect(page.getByRole("heading", { level: 1, name: "Каталог" })).toBeVisible();

    const washersRow = page.getByRole("button", { name: /Пральні машини/ });
    await expect(washersRow).toHaveAttribute("aria-pressed", "true");
    const closeFilters = page.getByRole("button", { name: "Закрити фільтри" });
    if (await closeFilters.isVisible()) {
      await closeFilters.dispatchEvent("click");
      await expect(closeFilters).toBeHidden();
    }

    const firstLink = page.locator(".catalog-model-link").first();
    await expect(firstLink).toBeVisible({ timeout: 10_000 });
    const modelName = (await firstLink.innerText()).trim();
    await firstLink.click();

    await expect(page).toHaveURL(/\/uk\/catalog\/washers\/[^/?]+/);
    await expect(page.getByRole("heading", { level: 1, name: modelName })).toBeVisible();

    const quote = page.getByRole("link", { name: /Отримати КП на цю модель/i });
    await expect(quote).toHaveAttribute("href", /m=/);
    await quote.click();
    await expect(page).toHaveURL(/\/uk\/quote\?m=/);
  });

  test("filters follow the category", async ({ page }) => {
    await page.goto("/uk/catalog");
    await openFiltersIfClosed(page);
    await expect(
      page.getByRole("slider", { name: "Мінімальне завантаження" }),
    ).toHaveCount(0);
    await expect(page.getByLabel("Нагрів")).toBeVisible();

    await page.goto("/uk/catalog/washers");
    await openFiltersIfClosed(page);
    await expect(
      page.getByRole("slider", { name: "Мінімальне завантаження" }),
    ).toBeVisible();

    await page.goto("/uk/catalog/ironing-rollers?kg=10-20");
    await openFiltersIfClosed(page);
    await expect(
      page.getByRole("slider", { name: "Мінімальне завантаження" }),
    ).toHaveCount(0);
    await expect(page.locator(".catalog-model-link")).toHaveCount(14);
    await expect(page).not.toHaveURL(/[?&]kg=/);

    await page.goto("/uk/catalog/laundry-carts");
    await openFiltersIfClosed(page);
    await expect(page.locator(".catalog-kg-label", { hasText: /Об.?єм/ })).toBeVisible();
    await expect(
      page.getByRole("slider", { name: "Мінімальне завантаження" }),
    ).toHaveCount(0);
  });

  test("range params without a control show a dismissible chip", async ({ page }) => {
    await page.goto("/uk/catalog?kg=23-53");
    await expect(page.locator('[data-filters-ready="true"]')).toBeVisible();
    await expect(
      page.getByRole("slider", { name: "Мінімальне завантаження" }),
    ).toHaveCount(0);

    const chip = page.getByRole("button", { name: /23–53\s*кг/ });
    await expect(chip).toBeVisible();
    await chip.click();
    await expect(page).not.toHaveURL(/[?&]kg=/);
    await expect(chip).toHaveCount(0);

    await page.goto("/uk/catalog/washers?kg=23-53");
    await openFiltersIfClosed(page);
    await expect(
      page.getByRole("slider", { name: "Мінімальне завантаження" }),
    ).toBeVisible();
    await expect(page.locator(".catalog-active-chip")).toHaveCount(0);
  });

  test("category page is static-filtered", async ({ page }) => {
    await page.goto("/uk/catalog/dryers");
    await expect(
      page.getByRole("heading", { level: 1, name: "Сушильні машини" }),
    ).toBeVisible();
    await expect(page.locator(".catalog-model-link").first()).toBeVisible();
  });

  test("washers default order is kg then natural name", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/uk/catalog/washers");
    await expect(page.locator(".catalog-model-link").first()).toBeVisible();

    const names = await page.locator(".catalog-model-link").allTextContents();
    expect(names.slice(0, 4)).toEqual([
      "LAP-08 TP2 E P",
      "LAP-08 TP2 E V",
      "LAP-08 TP2 HW P",
      "LAP-08 TP2 HW V",
    ]);
    const i11 = names.indexOf("LA-11 TP2 E");
    const i14 = names.indexOf("LA-14 TP2 E");
    expect(i11).toBeGreaterThan(-1);
    expect(i14).toBeGreaterThan(i11);

    const loadHeader = page.locator('[data-col="loadKg"][aria-sort="ascending"]');
    await expect(loadHeader).toBeVisible();
    await expect(loadHeader).toContainText(/Завантаження,\s*кг/);
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
