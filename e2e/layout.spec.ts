import { expect, test, type Page } from "@playwright/test";

const WIDTHS = [1440, 1024, 390] as const;

async function leftEdge(page: Page, selector: string): Promise<number> {
  const box = await page.locator(selector).first().boundingBox();
  expect(box, selector).not.toBeNull();
  return box!.x;
}

async function expectSharedLeftEdge(page: Page, selectors: string[]) {
  const edges = await Promise.all(selectors.map((selector) => leftEdge(page, selector)));
  const min = Math.min(...edges);
  const max = Math.max(...edges);
  expect(max - min).toBeLessThanOrEqual(1);
}

async function expectNoHorizontalScroll(page: Page) {
  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(overflows).toBe(false);
}

test.describe("layout alignment", () => {
  for (const width of WIDTHS) {
    test(`home edges align at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/uk");
      await expect(page.locator('[data-lineup-ready="true"]')).toBeVisible();

      await expectSharedLeftEdge(page, [
        ".site-brand",
        "h1",
        "#industries h2",
        "#industries .row-title",
        ".site-footer-col",
      ]);
      await expectNoHorizontalScroll(page);

      const machines = page.locator(".lineup-machine");
      const labels = page.locator(".lineup-kg");
      const count = await machines.count();
      expect(count).toBeGreaterThan(1);
      expect(await labels.count()).toBe(count);

      for (let i = 0; i < count; i += 1) {
        const machine = await machines.nth(i).boundingBox();
        const label = await labels.nth(i).boundingBox();
        expect(machine).not.toBeNull();
        expect(label).not.toBeNull();
        const machineCenter = machine!.x + machine!.width / 2;
        const labelCenter = label!.x + label!.width / 2;
        expect(Math.abs(machineCenter - labelCenter)).toBeLessThanOrEqual(1);
      }
    });

    test(`catalog edges align at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/uk/catalog");
      await expect(page.locator("h1")).toBeVisible();

      const edges = [".site-brand", "h1", ".site-footer-col"];
      if (width >= 1280) edges.push(".catalog-panel");
      else edges.push(".catalog-filters-toggle", ".catalog-meta");
      await expectSharedLeftEdge(page, edges);
      await expectNoHorizontalScroll(page);
    });
  }
});
