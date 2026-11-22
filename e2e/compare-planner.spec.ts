import { expect, test, type Locator, type Page } from "@playwright/test";

const SLUG = "lap-08-tp2-e-v";
const SLUG_B = "lap-08-tp2-e-p";

async function openCompare(page: Page, slugs: string[]) {
  await page.goto(`/uk/compare?m=${encodeURIComponent(slugs.join(","))}`);
  await page.waitForFunction(
    () => document.body.dataset.compareReady === "true",
    undefined,
    { timeout: 30_000 },
  );
  await expect(
    page.getByRole("heading", { level: 1, name: "Порівняння моделей" }),
  ).toBeVisible();
  // Wait until the client island leaves the loading state.
  await expect(page.getByText("Завантаження порівняння…")).toHaveCount(0, {
    timeout: 30_000,
  });
  const planner = page.getByRole("application", {
    name: "План приміщення з машинами",
  });
  await expect(planner).toBeVisible({ timeout: 15_000 });
  return planner;
}

async function assertLabelsReadable(planner: Locator) {
  const labels = planner.locator(".floor-planner-label");
  await expect(labels.first()).toBeVisible();
  const count = await labels.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i += 1) {
    const box = await labels.nth(i).boundingBox();
    expect(box).not.toBeNull();
    if (!box) continue;
    expect(box.height).toBeGreaterThanOrEqual(11);
  }
}

async function assertBadgeInStage(planner: Locator) {
  const stage = await planner.boundingBox();
  const badge = planner.locator(".floor-planner-badge").first();
  await expect(badge).toBeVisible();
  const box = await badge.boundingBox();
  expect(stage).not.toBeNull();
  expect(box).not.toBeNull();
  if (!stage || !box) return;
  expect(box.x).toBeGreaterThanOrEqual(stage.x - 1);
  expect(box.y).toBeGreaterThanOrEqual(stage.y - 1);
  expect(box.x + box.width).toBeLessThanOrEqual(stage.x + stage.width + 1);
  expect(box.y + box.height).toBeLessThanOrEqual(stage.y + stage.height + 1);
}

for (const width of [1440, 390] as const) {
  test.describe(`compare planner labels @${width}`, () => {
    test.use({ viewport: { width, height: width === 390 ? 844 : 900 } });

    test("labels stay readable; badge stays in view at 100/50/300%", async ({
      page,
    }) => {
      const planner = await openCompare(page, [SLUG, SLUG_B]);
      await expect(planner.locator(".floor-planner-machine")).toHaveCount(2);

      const first = planner.locator(".floor-planner-machine").first();
      await first.click();
      await planner.focus();
      // Nudge past the top-left wall (50 mm steps from the default 100×100 mm).
      for (let i = 0; i < 8; i += 1) {
        await planner.press("ArrowLeft");
        await planner.press("ArrowUp");
      }
      await expect(first).toHaveAttribute("data-x-mm", /^-/);
      await expect(planner.locator(".floor-planner-badge").first()).toBeVisible({
        timeout: 10_000,
      });
      await assertLabelsReadable(planner);
      await assertBadgeInStage(planner);

      const zoomValue = page.locator(".floor-planner-zoom-value");
      const zoomOut = page.getByRole("button", { name: "Зменшити план" });
      const zoomIn = page.getByRole("button", { name: "Збільшити план" });
      const fit = page.getByRole("button", { name: "Вмістити" });

      await fit.click();
      await zoomOut.click();
      await zoomOut.click();
      await expect(zoomValue).toHaveText("50%");
      await assertLabelsReadable(planner);
      await assertBadgeInStage(planner);

      await fit.click();
      for (let i = 0; i < 8; i += 1) {
        await zoomIn.click();
      }
      await expect(zoomValue).toHaveText("300%");
      await assertLabelsReadable(planner);
      await assertBadgeInStage(planner);
    });
  });
}
