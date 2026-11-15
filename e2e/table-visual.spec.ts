import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const WIDTHS = [1280, 1440] as const;
const ROUTES = [
  { id: "washers", path: "/uk/catalog/washers" },
  { id: "dryers", path: "/uk/catalog/dryers" },
  { id: "flatwork-ironers", path: "/uk/catalog/flatwork-ironers" },
  { id: "laundry-carts", path: "/uk/catalog/laundry-carts" },
  { id: "catalog", path: "/uk/catalog" },
] as const;

const QA_DIR = path.join(process.cwd(), "docs", "qa", "p8");

type VisualMetrics = {
  wrapRight: number;
  scrollWidth: number;
  clientWidth: number;
  overflowing: number;
  maxCellOvershoot: number;
  numericAlignMax: number;
  baselineSpread: number;
  barToLetter: number | null;
};

async function measure(page: Page): Promise<VisualMetrics> {
  return page.evaluate(() => {
    const wrap = document.querySelector(".data-table-wrap");
    if (!wrap) {
      throw new Error("missing .data-table-wrap");
    }
    const wrapRight = wrap.getBoundingClientRect().right;
    const cells = [...wrap.querySelectorAll("th, td")].filter((el) => {
      const r = (el as HTMLElement).getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }) as HTMLElement[];
    let overflowing = 0;
    let maxCellOvershoot = 0;
    for (const el of cells) {
      const over = el.getBoundingClientRect().right - wrapRight;
      if (over > 1) {
        overflowing += 1;
        maxCellOvershoot = Math.max(maxCellOvershoot, over);
      }
    }

    const numericCols = [
      ...wrap.querySelectorAll("thead th.is-num"),
    ] as HTMLElement[];
    let numericAlignMax = 0;
    for (const th of numericCols) {
      const col = th.getAttribute("data-col");
      if (!col) continue;
      const label =
        th.querySelector(".data-table-sort-label") ??
        th.querySelector(".data-table-th-label");
      const td = wrap.querySelector(
        `tbody tr:first-child td[data-col="${col}"]`,
      );
      if (!label || !td) continue;
      const range = document.createRange();
      range.selectNodeContents(label);
      const thRight = range.getBoundingClientRect().right;
      range.selectNodeContents(td);
      const tdRight = range.getBoundingClientRect().right;
      numericAlignMax = Math.max(
        numericAlignMax,
        Math.abs(thRight - tdRight),
      );
    }

    // Skip columns hidden by @container rules (rect 0×0) — they would
    // inflate baseline spread to ~headerY − 0.
    const ths = [...wrap.querySelectorAll("thead th")].filter((th) => {
      const r = (th as HTMLElement).getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }) as HTMLElement[];
    const baselines = ths.map((th) => {
      const label =
        th.querySelector(".data-table-sort-label") ??
        th.querySelector(".data-table-th-label") ??
        th;
      const range = document.createRange();
      range.selectNodeContents(label);
      const rect = range.getBoundingClientRect();
      return rect.height > 0 ? rect.bottom : th.getBoundingClientRect().bottom;
    });
    const baselineSpread =
      baselines.length > 0
        ? Math.max(...baselines) - Math.min(...baselines)
        : 0;

    const active = document.querySelector(
      ".catalog-cat-row.is-active",
    ) as HTMLElement | null;
    const name = active?.querySelector(
      ".catalog-cat-name",
    ) as HTMLElement | null;
    let barToLetter: number | null = null;
    if (active && name && name.firstChild) {
      const barRight = active.getBoundingClientRect().left + 2;
      const range = document.createRange();
      const text = name.firstChild;
      range.setStart(text, 0);
      range.setEnd(text, Math.min(1, text.textContent?.length ?? 1));
      barToLetter = range.getBoundingClientRect().left - barRight;
    }

    return {
      wrapRight,
      scrollWidth: wrap.scrollWidth,
      clientWidth: wrap.clientWidth,
      overflowing,
      maxCellOvershoot,
      numericAlignMax,
      baselineSpread,
      barToLetter,
    };
  });
}

test.describe("catalog table visual p8", () => {
  test.beforeAll(() => {
    fs.mkdirSync(QA_DIR, { recursive: true });
  });

  for (const width of WIDTHS) {
    for (const route of ROUTES) {
      test(`${route.id} @ ${width}`, async ({ page }, testInfo) => {
        test.skip(
          testInfo.project.name !== "chromium",
          "desktop layout metrics once on chromium",
        );
        await page.setViewportSize({ width, height: 900 });
        await page.goto(route.path);
        await expect(page.locator('[data-filters-ready="true"]')).toBeVisible();

        const shot = path.join(QA_DIR, `after-${route.id}-${width}.png`);
        await page.screenshot({ path: shot, fullPage: false });

        const m = await measure(page);

        expect(
          m.overflowing,
          `cells past wrap (max overshoot ${m.maxCellOvershoot.toFixed(2)}px)`,
        ).toBe(0);
        expect(
          m.scrollWidth,
          `scrollWidth ${m.scrollWidth} > clientWidth ${m.clientWidth}`,
        ).toBeLessThanOrEqual(m.clientWidth);
        expect(
          m.numericAlignMax,
          `numeric th/td right delta ${m.numericAlignMax.toFixed(2)}px`,
        ).toBeLessThanOrEqual(1);
        expect(
          m.baselineSpread,
          `th baseline spread ${m.baselineSpread.toFixed(2)}px`,
        ).toBeLessThanOrEqual(1);
        expect(m.barToLetter, "active bar → first letter").not.toBeNull();
        expect(
          m.barToLetter!,
          `bar→letter ${m.barToLetter!.toFixed(2)}px`,
        ).toBeGreaterThanOrEqual(8);

        console.log(
          JSON.stringify({
            route: route.id,
            width,
            a_overflowing: m.overflowing,
            a_scrollOk: m.scrollWidth <= m.clientWidth,
            a_scrollWidth: m.scrollWidth,
            a_clientWidth: m.clientWidth,
            b_numericAlignMax: Number(m.numericAlignMax.toFixed(3)),
            c_baselineSpread: Number(m.baselineSpread.toFixed(3)),
            d_barToLetter: Number(m.barToLetter!.toFixed(3)),
          }),
        );
      });
    }
  }
});
