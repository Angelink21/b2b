import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

type CatalogGenerated = {
  products: Array<{ slug: string; category: string; seriesId: string }>;
  series: Array<{
    id: string;
    fullBullets?: string[];
    descriptions?: {
      uk: { fullBullets: string[]; fullBlocks?: Array<{ kind: string }> };
    };
  }>;
};

function loadCatalog(): CatalogGenerated {
  return JSON.parse(
    fs.readFileSync(
      path.join(process.cwd(), "src", "data", "catalog.generated.json"),
      "utf8",
    ),
  ) as CatalogGenerated;
}

function bulletCount(series: CatalogGenerated["series"][number]): number {
  const blocks = series.descriptions?.uk.fullBlocks;
  if (blocks && blocks.length > 0) {
    return blocks.filter((b) => b.kind === "bullet").length;
  }
  return (
    series.descriptions?.uk.fullBullets.length ??
    series.fullBullets?.length ??
    0
  );
}

/** Prefer a series with ≥8 bullets so two-column layout can be asserted at 1366. */
function pickModelPath(catalog: CatalogGenerated): {
  path: string;
  bullets: number;
} {
  let best: { path: string; bullets: number } | null = null;
  for (const product of catalog.products) {
    const series = catalog.series.find((s) => s.id === product.seriesId);
    if (!series) continue;
    const n = bulletCount(series);
    if (n < 1) continue;
    const candidate = {
      path: `/uk/catalog/${product.category}/${product.slug}`,
      bullets: n,
    };
    if (!best || (n >= 8 && best.bullets < 8) || n > best.bullets) {
      best = candidate;
    }
    if (n >= 8) break;
  }
  if (!best) {
    throw new Error("No model with series feature bullets in catalog");
  }
  return best;
}

/** Separation between title block and first list item (vertical or horizontal). */
async function separationTitleToList(page: Page): Promise<number> {
  return page.evaluate(() => {
    const title = document.querySelector(".series-features-title");
    const first = document.querySelector(".series-features-item");
    if (!title || !first) return -1;
    const t = title.getBoundingClientRect();
    const f = first.getBoundingClientRect();
    const vertical = f.top - t.bottom;
    const horizontal = f.left - t.right;
    if (vertical >= 0 && f.top >= t.top - 2) {
      // Stacked or list starts below title
      if (vertical >= 0 && Math.abs(f.left - t.left) < 40) return vertical;
    }
    if (horizontal >= 0) return horizontal;
    return Math.max(vertical, horizontal);
  });
}

const catalog = loadCatalog();
const sample = pickModelPath(catalog);

test.describe("SeriesFeatures layout", () => {
  test("1366: title/list gap, two columns when ≥8, row heights", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.goto(sample.path);
    const section = page.locator(".series-features");
    await expect(section).toBeVisible();

    const gap = await separationTitleToList(page);
    expect(gap).toBeGreaterThanOrEqual(20);

    const overlap = await page.evaluate(() => {
      const title = document
        .querySelector(".series-features-title")
        ?.getBoundingClientRect();
      const first = document
        .querySelector(".series-features-item")
        ?.getBoundingClientRect();
      if (!title || !first) return true;
      const noOverlap =
        title.right <= first.left + 1 ||
        title.bottom <= first.top + 1 ||
        first.right <= title.left + 1 ||
        first.bottom <= title.top + 1;
      return !noOverlap;
    });
    expect(overlap).toBe(false);

    const colCount = await page.evaluate(() => {
      const list = document.querySelector(".series-features-list");
      if (!list) return 0;
      const style = getComputedStyle(list);
      const cols = style.gridTemplateColumns.split(" ").filter(Boolean);
      return cols.length >= 2 ? 2 : 1;
    });

    if (sample.bullets >= 8) {
      expect(colCount).toBe(2);
      const heights = await page.evaluate(() => {
        const items = Array.from(
          document.querySelectorAll(".series-features-item"),
        ) as HTMLElement[];
        const pairs: number[][] = [];
        for (let i = 0; i < items.length; i += 1) {
          const a = items[i]!.getBoundingClientRect();
          for (let j = i + 1; j < items.length; j += 1) {
            const b = items[j]!.getBoundingClientRect();
            if (Math.abs(a.top - b.top) <= 2) {
              pairs.push([a.height, b.height]);
            }
          }
        }
        return pairs;
      });
      expect(heights.length).toBeGreaterThan(0);
      for (const [ha, hb] of heights) {
        expect(Math.abs(ha - hb)).toBeLessThanOrEqual(1);
      }
    }

    const softHyphenBreaks = await page.evaluate(() =>
      Array.from(document.querySelectorAll(".series-features-text")).some((el) =>
        (el.textContent ?? "").includes("\u00ad"),
      ),
    );
    expect(softHyphenBreaks).toBe(false);
  });

  test("390: single column, title above list with gap ≥20px", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(sample.path);
    await expect(page.locator(".series-features")).toBeVisible();

    const gap = await page.evaluate(() => {
      const title = document.querySelector(".series-features-title");
      const first = document.querySelector(".series-features-item");
      if (!title || !first) return -1;
      return first.getBoundingClientRect().top - title.getBoundingClientRect().bottom;
    });
    expect(gap).toBeGreaterThanOrEqual(20);

    const colCount = await page.evaluate(() => {
      const list = document.querySelector(".series-features-list");
      if (!list) return 0;
      const style = getComputedStyle(list);
      if (style.display === "grid") {
        const cols = style.gridTemplateColumns.split(" ").filter(Boolean);
        return cols.length >= 2 ? 2 : 1;
      }
      return 1;
    });
    expect(colCount).toBe(1);

    const overlap = await page.evaluate(() => {
      const title = document
        .querySelector(".series-features-title")
        ?.getBoundingClientRect();
      const first = document
        .querySelector(".series-features-item")
        ?.getBoundingClientRect();
      if (!title || !first) return true;
      return title.bottom > first.top + 1;
    });
    expect(overlap).toBe(false);
  });
});
