import { chromium } from "@playwright/test";

const base = process.env.BASE_URL ?? "http://127.0.0.1:3031";
const paths = [
  "/uk/catalog/flatwork-ironers",
  "/uk/catalog/washers",
  "/uk/catalog/dryers",
  "/uk/catalog/laundry-carts",
  "/uk/catalog/ironing-rollers",
  "/uk/catalog/water-recovery",
  "/uk/catalog/finishing",
  "/uk/catalog/washer-dryers",
  "/uk/catalog",
];
const widths = [1100, 1180, 1280, 1440];

const browser = await chromium.launch();
const page = await browser.newPage();
const report = [];

for (const width of widths) {
  await page.setViewportSize({ width, height: 900 });
  for (const path of paths) {
    await page.goto(`${base}${path}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-filters-ready="true"]', { timeout: 20_000 });
    const row = await page.evaluate(() => {
      const panel = document.querySelector(".catalog-panel");
      const results = document.querySelector(".catalog-results");
      const wrap = document.querySelector(".data-table-wrap");
      const table = document.querySelector(".data-table");
      const panelStyle = panel ? getComputedStyle(panel) : null;
      const layout = document.querySelector(".catalog-layout");
      const layoutCols = layout ? getComputedStyle(layout).gridTemplateColumns : null;
      const resultsRight = results?.getBoundingClientRect().right ?? 0;
      const overflowing = [...(wrap?.querySelectorAll("th, td") ?? [])]
        .filter((el) => el.getBoundingClientRect().right > resultsRight + 1)
        .map((el) => el.getAttribute("data-col"));
      const rangeHeads = [...document.querySelectorAll(".catalog-range-head")].map((h) => ({
        h: Math.round(h.getBoundingClientRect().height),
        label: h.querySelector(".catalog-kg-label")?.textContent?.trim(),
        value: h.querySelector(".catalog-range-value")?.textContent?.trim(),
      }));
      return {
        panelDisplay: panelStyle?.display,
        panelWidth: panel ? Math.round(panel.getBoundingClientRect().width) : null,
        panelGridColumn: panelStyle?.gridColumn ?? null,
        resultsGridColumn: results ? getComputedStyle(results).gridColumn : null,
        layoutCols,
        resultsClient: results?.clientWidth ?? null,
        resultsScroll: results?.scrollWidth ?? null,
        wrapClient: wrap?.clientWidth ?? null,
        wrapScroll: wrap?.scrollWidth ?? null,
        tableWidth: table ? Math.round(table.getBoundingClientRect().width) : null,
        overflowing: [...new Set(overflowing)],
        actions: !!document.querySelector('[data-col="actions"]'),
        shaftVisible: !!document.querySelector('[data-col="shaftDiameterMm"]') &&
          getComputedStyle(document.querySelector('[data-col="shaftDiameterMm"]')).display !== "none",
        rangeHeads,
        lead: document.querySelector(".catalog-lead")?.textContent?.trim() ?? null,
        samplePower: document.querySelector("tbody [data-col='power']")?.textContent?.trim() ?? null,
        sampleWidth: document.querySelector("tbody [data-col='workingWidthMm']")?.textContent?.trim() ?? null,
      };
    });
    report.push({ width, path, ...row });
  }
}

console.log(JSON.stringify(report, null, 2));
await browser.close();
