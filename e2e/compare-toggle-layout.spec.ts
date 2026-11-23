import { expect, test, type Page } from "@playwright/test";

const WIDTHS = [1440, 768, 390] as const;

const MODEL_PATHS = [
  "/uk/catalog/washers/lap-08-tp2-e-p",
  "/uk/catalog/washers/la-18-tp2-e",
  "/uk/catalog/dryers/sc-11-m-e",
  "/uk/catalog/washers/haier-hcw12cbd",
  "/uk/catalog/washers/ln-35c-tp2-e",
] as const;

type Box = { x: number; y: number; width: number; height: number };

function overlaps(a: Box, b: Box, tol = 1): boolean {
  const ax2 = a.x + a.width;
  const ay2 = a.y + a.height;
  const bx2 = b.x + b.width;
  const by2 = b.y + b.height;
  const ox = Math.min(ax2, bx2) - Math.max(a.x, b.x);
  const oy = Math.min(ay2, by2) - Math.max(a.y, b.y);
  return ox > tol && oy > tol;
}

function containedIn(child: Box, parent: Box, tol = 1): boolean {
  return (
    child.x >= parent.x - tol &&
    child.y >= parent.y - tol &&
    child.x + child.width <= parent.x + parent.width + tol &&
    child.y + child.height <= parent.y + parent.height + tol
  );
}

async function assertListLayout(
  page: Page,
  listSelector: string,
  itemSelector: string,
  buttonSelector: string,
  options: { allowHorizontalOverflow?: boolean } = {},
) {
  const list = page.locator(listSelector).first();
  if ((await list.count()) === 0) return;
  await expect(list).toBeVisible();

  const listBox = await list.boundingBox();
  expect(listBox, listSelector).not.toBeNull();

  const items = list.locator(itemSelector);
  await expect
    .poll(async () => items.count(), { timeout: 10_000 })
    .toBeGreaterThan(0);
  await expect(items.first()).toBeVisible();
  const count = await items.count();
  expect(count).toBeGreaterThan(0);

  const boxes: Box[] = [];
  for (let i = 0; i < count; i += 1) {
    const item = items.nth(i);
    if (!(await item.isVisible())) continue;
    const box = await item.boundingBox();
    if (!box || box.width < 1 || box.height < 1) continue;
    boxes.push(box);
    if (!options.allowHorizontalOverflow) {
      expect(containedIn(box, listBox!)).toBe(true);
    }
    // Horizontal strip: cards may extend past the visible scrollport; overlap
    // checks below still enforce that siblings do not stack on each other.
  }
  expect(boxes.length).toBeGreaterThan(0);

  for (let i = 0; i < boxes.length - 1; i += 1) {
    expect(
      overlaps(boxes[i]!, boxes[i + 1]!),
      `${itemSelector}[${i}] overlaps [${i + 1}]`,
    ).toBe(false);
  }

  const widths: number[] = [];
  for (let i = 0; i < count; i += 1) {
    const item = items.nth(i);
    if (!(await item.isVisible())) continue;
    const itemBox = await item.boundingBox();
    if (!itemBox) continue;
    const button = item.locator(buttonSelector).first();
    if ((await button.count()) === 0) continue;
    if (!(await button.isVisible())) continue;
    const box = await button.boundingBox();
    expect(box, `${buttonSelector} in ${itemSelector}[${i}]`).not.toBeNull();
    expect(containedIn(box!, itemBox)).toBe(true);
    widths.push(box!.width);
  }

  if (widths.length > 1) {
    const minW = Math.min(...widths);
    const maxW = Math.max(...widths);
    expect(maxW - minW).toBeLessThanOrEqual(1);
  }
}

async function assertRowChildrenNoOverlap(
  page: Page,
  rowSelector: string,
  options: { visibleOnly?: boolean } = {},
) {
  const rows = page.locator(rowSelector);
  const count = await rows.count();
  const viewport = page.viewportSize();
  for (let i = 0; i < count; i += 1) {
    const row = rows.nth(i);
    const rowBox = await row.boundingBox();
    if (!rowBox) continue;
    if (
      options.visibleOnly &&
      viewport &&
      (rowBox.x + rowBox.width < 1 || rowBox.x > viewport.width - 1)
    ) {
      continue;
    }
    const kids = row.locator(":scope > *");
    const kidCount = await kids.count();
    const boxes: Box[] = [];
    for (let k = 0; k < kidCount; k += 1) {
      const box = await kids.nth(k).boundingBox();
      if (!box || box.width < 1 || box.height < 1) continue;
      boxes.push(box);
    }
    for (let a = 0; a < boxes.length - 1; a += 1) {
      for (let b = a + 1; b < boxes.length; b += 1) {
        expect(
          overlaps(boxes[a]!, boxes[b]!),
          `${rowSelector}[${i}] child ${a} overlaps ${b}`,
        ).toBe(false);
      }
    }
  }
}

test.describe("CompareToggle layout integrity", () => {
  for (const width of WIDTHS) {
    test.describe(`${width}px`, () => {
      test.use({ viewport: { width, height: 900 } });

      for (const path of MODEL_PATHS) {
        test(`model ${path}`, async ({ page }) => {
          await page.goto(path);
          await expect(page.locator("h1")).toBeVisible();

          if ((await page.locator(".model-related-list").count()) > 0) {
            await assertListLayout(
              page,
              ".model-related-list",
              ".model-related-row",
              ".model-related-row .compare-toggle",
            );
            await assertRowChildrenNoOverlap(page, ".model-related-row");
          }

          if ((await page.locator(".model-family-list").count()) > 0) {
            await assertListLayout(
              page,
              ".model-family-list",
              ".model-family-row",
              ".model-family-row .compare-toggle",
            );
            await assertRowChildrenNoOverlap(page, ".model-family-row");
          }

          if ((await page.locator(".model-cta .compare-toggle").count()) > 0) {
            await assertRowChildrenNoOverlap(page, ".model-cta");
          }
        });
      }

      test("home flagship and range strip", async ({ page }) => {
        await page.goto("/uk");
        await expect(page.locator(".flagship-card").first()).toBeVisible({
          timeout: 15_000,
        });

        await assertListLayout(
          page,
          ".flagship-grid",
          ".flagship-card",
          ".flagship-card .compare-toggle",
        );
        await assertRowChildrenNoOverlap(page, ".flagship-card-actions");

        const stripCards = page.locator(
          ".lineup-range-strip-list .lineup-range-strip-card",
        );
        if ((await stripCards.count()) > 0) {
          await expect(stripCards.first()).toBeVisible({ timeout: 10_000 });
          await assertListLayout(
            page,
            ".lineup-range-strip-list",
            ".lineup-range-strip-card",
            ".lineup-range-strip-card .compare-toggle",
            { allowHorizontalOverflow: width <= 768 },
          );
          await assertRowChildrenNoOverlap(page, ".lineup-range-strip-actions", {
            visibleOnly: true,
          });
        }
      });

      test("catalog rows", async ({ page }) => {
        await page.goto("/uk/catalog");
        await expect(page.locator("h1")).toBeVisible();

        const rows = page.locator(".data-table tbody tr");
        await expect(rows.first()).toBeVisible({ timeout: 10_000 });
        const count = Math.min(await rows.count(), 12);
        const boxes: Box[] = [];

        for (let i = 0; i < count; i += 1) {
          const box = await rows.nth(i).boundingBox();
          expect(box).not.toBeNull();
          boxes.push(box!);
        }
        for (let i = 0; i < boxes.length - 1; i += 1) {
          expect(overlaps(boxes[i]!, boxes[i + 1]!)).toBe(false);
        }

        const compareControls = page.locator(
          ".data-table tbody tr .compare-check",
        );
        const controlCount = Math.min(await compareControls.count(), 12);
        if (controlCount > 1) {
          const widths: number[] = [];
          for (let i = 0; i < controlCount; i += 1) {
            const box = await compareControls.nth(i).boundingBox();
            expect(box).not.toBeNull();
            expect(containedIn(box!, boxes[i]!)).toBe(true);
            widths.push(box!.width);
          }
          expect(Math.max(...widths) - Math.min(...widths)).toBeLessThanOrEqual(
            1,
          );
        }
      });

      test("compare page", async ({ page }) => {
        await page.goto(
          "/uk/compare?m=la-14-tp2-e,la-28-tp2-e,la-60c-tp2-e",
        );
        await expect(
          page.getByRole("heading", { level: 1, name: "Порівняння моделей" }),
        ).toBeVisible();
        await expect(page.locator(".compare-table")).toBeVisible({
          timeout: 15_000,
        });

        const columns = page.locator(
          ".compare-table thead th:not(.compare-sticky)",
        );
        const count = await columns.count();
        if (count > 1) {
          const boxes: Box[] = [];
          for (let i = 0; i < count; i += 1) {
            const box = await columns.nth(i).boundingBox();
            expect(box).not.toBeNull();
            boxes.push(box!);
          }
          for (let i = 0; i < boxes.length - 1; i += 1) {
            expect(overlaps(boxes[i]!, boxes[i + 1]!)).toBe(false);
          }
        }
      });
    });
  }
});
