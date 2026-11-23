import { expect, test, type Page } from "@playwright/test";

const WIDTHS = [1180, 1280, 1440] as const;
const CATEGORIES = [
  "/uk/catalog/flatwork-ironers",
  "/uk/catalog/washers",
  "/uk/catalog/dryers",
  "/uk/catalog/laundry-carts",
  "/uk/catalog/ironing-rollers",
  "/uk/catalog/water-recovery",
  "/uk/catalog/finishing",
  "/uk/catalog/washer-dryers",
  "/uk/catalog",
] as const;

async function openFiltersIfNeeded(page: Page) {
  await expect(page.locator('[data-filters-ready="true"]')).toBeVisible();
  const toggle = page.getByRole("button", { name: "Фільтри" });
  if (await toggle.isVisible()) {
    await toggle.click();
    await expect(page.getByRole("dialog", { name: "Фільтри" })).toBeVisible();
  }
}

test.describe("catalog layout p6", () => {
  for (const width of WIDTHS) {
    test(`flatwork-ironers fits at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/uk/catalog/flatwork-ironers");
      await expect(page.locator('[data-filters-ready="true"]')).toBeVisible();

      if (width >= 1280) {
        await expect(page.locator(".catalog-panel")).toBeVisible();
        await expect(page.locator('[data-col="actions"]')).toHaveCount(0);

        const metrics = await page.evaluate(() => {
          const results = document.querySelector(".catalog-results");
          const wrap = document.querySelector(".data-table-wrap");
          const panel = document.querySelector(".catalog-panel");
          if (!results || !wrap || !panel) return null;
          const resultsRight = results.getBoundingClientRect().right;
          const overflowing = [...wrap.querySelectorAll("th, td")].filter(
            (el) => el.getBoundingClientRect().right > resultsRight + 1,
          ).length;
          return {
            panelWidth: Math.round(panel.getBoundingClientRect().width),
            resultsClient: results.clientWidth,
            resultsScroll: results.scrollWidth,
            wrapClient: wrap.clientWidth,
            wrapScroll: wrap.scrollWidth,
            overflowing,
          };
        });
        expect(metrics).not.toBeNull();
        expect(metrics!.panelWidth).toBe(240);
        expect(metrics!.resultsScroll).toBeLessThanOrEqual(metrics!.resultsClient);
        expect(metrics!.wrapScroll).toBeLessThanOrEqual(metrics!.wrapClient + 1);
        expect(metrics!.overflowing).toBe(0);

        await openFiltersIfNeeded(page);
        const rangeOk = await page.evaluate(() =>
          [...document.querySelectorAll(".catalog-range-head")].every((head) => {
            const label = head.querySelector(".catalog-kg-label");
            const value = head.querySelector(".catalog-range-value");
            if (!label || !value) return false;
            const truncated =
              label.textContent?.includes("…") ||
              label.textContent?.includes("...");
            return (
              Math.round(head.getBoundingClientRect().height) <= 48 &&
              !truncated &&
              label.scrollWidth <= label.clientWidth + 1 &&
              value.scrollWidth <= value.clientWidth + 1
            );
          }),
        );
        expect(rangeOk).toBe(true);
      } else {
        // Sheet mode: results may scroll, first column stays sticky.
        await expect(page.getByRole("button", { name: "Фільтри" })).toBeVisible();
        const sticky = await page.evaluate(() => {
          const name = document.querySelector('.data-table [data-col="name"]');
          return name ? getComputedStyle(name).position : null;
        });
        expect(sticky).toBe("sticky");
      }
    });
  }

  for (const path of CATEGORIES) {
    test(`no actions column on ${path}`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(path);
      await expect(page.locator('[data-filters-ready="true"]')).toBeVisible();
      await expect(page.locator('[data-col="actions"]')).toHaveCount(0);
      await expect(page.getByRole("checkbox", { name: /Порівняти|Compare/ }).first()).toBeVisible();
    });
  }
});
