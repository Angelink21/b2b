import { expect, test, type Page } from "@playwright/test";

const VIEWPORTS = [
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
] as const;

async function ready(page: Page) {
  await expect(page.locator('[data-filters-ready="true"]')).toBeVisible();
  await expect(page.locator(".catalog-panel")).toBeVisible();
}

async function dragThumb(
  page: Page,
  facet: string,
  which: "min" | "max",
  deltaX: number,
) {
  const thumb = page.locator(
    `.catalog-range[data-facet="${facet}"] .range-dual-thumb.is-${which}`,
  );
  await thumb.scrollIntoViewIfNeeded();
  const box = await thumb.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  const startX = box!.x + box!.width / 2;
  const startY = box!.y + box!.height / 2;

  const samples: Array<{
    panelH: number;
    panelW: number;
    zoneH: number;
    zoneW: number;
    trackCy: number;
    thumbCy: number;
    cursorY: number;
    gap: number;
    scrollY: number;
  }> = [];

  await page.mouse.move(startX, startY);
  await page.mouse.down();

  const steps = 8;
  for (let i = 1; i <= steps; i++) {
    const x = startX + (deltaX * i) / steps;
    const y = startY;
    await page.mouse.move(x, y);
    const sample = await page.evaluate(
      ({ facetName, whichThumb, cursorX, cursorY }) => {
        const range = document.querySelector(
          `.catalog-range[data-facet="${facetName}"]`,
        );
        const panel = document.querySelector(".catalog-panel");
        const zone = range?.querySelector(".range-dual");
        const track = range?.querySelector(".range-dual-track");
        const thumbEl = range?.querySelector(
          `.range-dual-thumb.is-${whichThumb}`,
        );
        if (!range || !panel || !zone || !track || !thumbEl) return null;
        const panelBox = panel.getBoundingClientRect();
        const zoneBox = zone.getBoundingClientRect();
        const trackBox = track.getBoundingClientRect();
        const thumbBox = thumbEl.getBoundingClientRect();
        const thumbCx = thumbBox.left + thumbBox.width / 2;
        const thumbCy = thumbBox.top + thumbBox.height / 2;
        const trackCy = trackBox.top + trackBox.height / 2;
        return {
          panelH: panelBox.height,
          panelW: panelBox.width,
          zoneH: zoneBox.height,
          zoneW: zoneBox.width,
          trackCy,
          thumbCy,
          cursorY,
          gap: Math.abs(cursorX - thumbCx),
          scrollY: window.scrollY,
        };
      },
      { facetName: facet, whichThumb: which, cursorX: x, cursorY: y },
    );
    expect(sample).not.toBeNull();
    samples.push(sample!);
  }

  await page.mouse.up();
  return { start: samples[0]!, samples, startScrollY: samples[0]!.scrollY };
}

async function assertStableDrag(
  page: Page,
  facet: string,
  which: "min" | "max",
  deltaX: number,
) {
  await page
    .locator(`.catalog-range[data-facet="${facet}"] .range-dual`)
    .scrollIntoViewIfNeeded();
  const before = await page.evaluate((facetName) => {
    const range = document.querySelector(
      `.catalog-range[data-facet="${facetName}"]`,
    );
    const panel = document.querySelector(".catalog-panel");
    const zone = range?.querySelector(".range-dual");
    if (!range || !panel || !zone) return null;
    return {
      panelH: panel.getBoundingClientRect().height,
      panelW: panel.getBoundingClientRect().width,
      zoneH: zone.getBoundingClientRect().height,
      zoneW: zone.getBoundingClientRect().width,
      scrollY: window.scrollY,
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
    };
  }, facet);
  expect(before).not.toBeNull();

  const { samples } = await dragThumb(page, facet, which, deltaX);
  const firstGap = samples[0]!.gap;

  for (const sample of samples) {
    expect(Math.abs(sample.panelH - before!.panelH)).toBeLessThanOrEqual(1);
    expect(Math.abs(sample.panelW - before!.panelW)).toBeLessThanOrEqual(1);
    expect(Math.abs(sample.zoneH - before!.zoneH)).toBeLessThanOrEqual(1);
    expect(Math.abs(sample.zoneW - before!.zoneW)).toBeLessThanOrEqual(1);
    expect(Math.abs(sample.thumbCy - sample.trackCy)).toBeLessThanOrEqual(1);
    expect(sample.gap).toBeLessThanOrEqual(firstGap + 1);
    expect(Math.abs(sample.scrollY - before!.scrollY)).toBeLessThanOrEqual(1);
  }

  await page.waitForTimeout(350);

  const after = await page.evaluate((facetName) => {
    const range = document.querySelector(
      `.catalog-range[data-facet="${facetName}"]`,
    );
    const panel = document.querySelector(".catalog-panel");
    const zone = range?.querySelector(".range-dual");
    const track = range?.querySelector(".range-dual-track");
    const thumbEl = range?.querySelector(".range-dual-thumb.is-max");
    if (!range || !panel || !zone || !track || !thumbEl) return null;
    const trackBox = track.getBoundingClientRect();
    const thumbBox = thumbEl.getBoundingClientRect();
    return {
      panelH: panel.getBoundingClientRect().height,
      panelW: panel.getBoundingClientRect().width,
      zoneH: zone.getBoundingClientRect().height,
      zoneW: zone.getBoundingClientRect().width,
      trackCy: trackBox.top + trackBox.height / 2,
      thumbCy: thumbBox.top + thumbBox.height / 2,
      scrollY: window.scrollY,
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
    };
  }, facet);
  expect(after).not.toBeNull();
  expect(Math.abs(after!.panelH - before!.panelH)).toBeLessThanOrEqual(1);
  expect(Math.abs(after!.panelW - before!.panelW)).toBeLessThanOrEqual(1);
  expect(Math.abs(after!.zoneH - before!.zoneH)).toBeLessThanOrEqual(1);
  expect(Math.abs(after!.zoneW - before!.zoneW)).toBeLessThanOrEqual(1);
  expect(Math.abs(after!.thumbCy - after!.trackCy)).toBeLessThanOrEqual(1);
  expect(Math.abs(after!.scrollY - before!.scrollY)).toBeLessThanOrEqual(1);
  expect(after!.scrollHeight).toBeGreaterThanOrEqual(after!.innerHeight);
}

test.describe("catalog filter panel stability", () => {
  for (const viewport of VIEWPORTS) {
    test(`width + power drag stable at ${viewport.width}x${viewport.height}`, async ({
      page,
      browserName,
    }) => {
      test.skip(browserName !== "chromium", "desktop chromium only");
      await page.setViewportSize(viewport);
      await page.goto("/uk/catalog/flatwork-ironers");
      await ready(page);

      await assertStableDrag(page, "width", "max", -80);

      const reset = page.locator(
        '.catalog-range[data-facet="width"] .catalog-range-reset',
      );
      await expect(reset).toBeVisible();
      const beforeReset = await page.evaluate(() => {
        const panel = document.querySelector(".catalog-panel");
        const range = document.querySelector(
          '.catalog-range[data-facet="width"]',
        );
        return {
          panelH: panel?.getBoundingClientRect().height ?? 0,
          rangeH: range?.getBoundingClientRect().height ?? 0,
          scrollY: window.scrollY,
        };
      });
      await reset.click();
      const afterReset = await page.evaluate(() => {
        const panel = document.querySelector(".catalog-panel");
        const range = document.querySelector(
          '.catalog-range[data-facet="width"]',
        );
        return {
          panelH: panel?.getBoundingClientRect().height ?? 0,
          rangeH: range?.getBoundingClientRect().height ?? 0,
          scrollY: window.scrollY,
          resetHidden: document
            .querySelector('.catalog-range[data-facet="width"] .catalog-range-reset')
            ?.classList.contains("is-hidden"),
        };
      });
      expect(Math.abs(afterReset.panelH - beforeReset.panelH)).toBeLessThanOrEqual(
        1,
      );
      expect(Math.abs(afterReset.rangeH - beforeReset.rangeH)).toBeLessThanOrEqual(
        1,
      );
      expect(Math.abs(afterReset.scrollY - beforeReset.scrollY)).toBeLessThanOrEqual(
        1,
      );
      expect(afterReset.resetHidden).toBe(true);

      await assertStableDrag(page, "power", "max", -60);
    });
  }
});
