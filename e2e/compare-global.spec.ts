import { expect, test } from "@playwright/test";

test.describe("global compare selection", () => {
  for (const width of [1440, 390] as const) {
    test(`home add two models at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/uk");
      await page.waitForFunction(
        () => document.body.dataset.compareReady === "true",
        null,
        { timeout: 15_000 },
      );

      const flagship = page.locator(".flagship-card").first();
      await expect(flagship).toBeVisible({ timeout: 10_000 });
      const cardBoxBefore = await flagship.boundingBox();
      expect(cardBoxBefore).not.toBeNull();

      const first = page.locator(".flagship-card").nth(0).locator(".compare-toggle");
      const second = page.locator(".flagship-card").nth(1).locator(".compare-toggle");
      await expect(first).toBeVisible();
      const widthBefore = (await first.boundingBox())?.width ?? 0;

      await first.click();
      await expect(first).toHaveAttribute("aria-pressed", "true");
      await second.click();
      await expect(second).toHaveAttribute("aria-pressed", "true");

      const widthAfter = (await first.boundingBox())?.width ?? 0;
      expect(Math.abs(widthAfter - widthBefore)).toBeLessThanOrEqual(1);

      const cardBoxAfter = await flagship.boundingBox();
      expect(cardBoxAfter).not.toBeNull();
      expect(
        Math.abs((cardBoxAfter?.width ?? 0) - (cardBoxBefore?.width ?? 0)),
      ).toBeLessThanOrEqual(1);
      expect(
        Math.abs((cardBoxAfter?.height ?? 0) - (cardBoxBefore?.height ?? 0)),
      ).toBeLessThanOrEqual(2);

      const tray = page.getByRole("region", { name: "Панель порівняння" });
      await expect(tray).toBeVisible();
      await expect(
        tray.getByRole("link", { name: /Порівняти \(2\)/ }),
      ).toBeVisible();

      await expect(page.getByRole("link", { name: /Порівняння, 2/ })).toBeVisible();

      const href = await tray
        .getByRole("link", { name: /Порівняти \(2\)/ })
        .getAttribute("href");
      expect(href).toMatch(/\/compare\?m=/);

      if (width === 390) {
        await expect(page.locator(".mobile-action-bar")).toBeVisible();
        const trayBox = await tray.boundingBox();
        const barBox = await page.locator(".mobile-action-bar").boundingBox();
        expect(trayBox).not.toBeNull();
        expect(barBox).not.toBeNull();
        if (trayBox && barBox) {
          expect(trayBox.y + trayBox.height).toBeLessThanOrEqual(barBox.y + 1);
        }
      }

      await page.goto(href!);
      await expect(page).toHaveURL(/\/uk\/compare\?m=/);
      await expect(page.locator(".compare-table")).toBeVisible();
    });
  }

  test("fifth compare attempt shows limit message", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/uk");
    await page.waitForFunction(
      () => document.body.dataset.compareReady === "true",
      null,
      { timeout: 15_000 },
    );

    const flagshipToggles = page.locator(".flagship-card .compare-toggle");
    await expect(flagshipToggles).toHaveCount(4);
    for (let i = 0; i < 4; i += 1) {
      await flagshipToggles.nth(i).click();
      await expect(flagshipToggles.nth(i)).toHaveAttribute("aria-pressed", "true");
    }

    const extra = page.locator(".lineup-range-strip .compare-toggle").first();
    await expect(extra).toHaveAttribute("aria-disabled", "true");
    // aria-disabled is intentional (focusable); Playwright skips it unless forced
    await extra.click({ force: true });
    await expect(page.locator(".compare-tray-limit")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator(".compare-tray-limit")).toContainText(
      /Можна порівняти до 4 моделей/,
    );
  });
});
