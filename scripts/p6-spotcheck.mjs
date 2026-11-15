import { chromium } from "@playwright/test";

const base = process.env.BASE_URL ?? "http://127.0.0.1:3031";
const browser = await chromium.launch();
const page = await browser.newPage();

for (const width of [1180, 1280, 1440]) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`${base}/uk/catalog/flatwork-ironers`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForSelector('[data-filters-ready="true"]');
  const row = await page.evaluate(() => {
    const panel = document.querySelector(".catalog-panel");
    const results = document.querySelector(".catalog-results");
    const wrap = document.querySelector(".data-table-wrap");
    const rr = results.getBoundingClientRect().right;
    const overflowing = [
      ...new Set(
        [...wrap.querySelectorAll("th, td")]
          .filter((el) => el.getBoundingClientRect().right > rr + 1)
          .map((el) => el.getAttribute("data-col")),
      ),
    ];
    const shaft = document.querySelector('[data-col="shaftDiameterMm"]');
    return {
      layout: getComputedStyle(document.querySelector(".catalog-layout"))
        .gridTemplateColumns,
      panelDisplay: getComputedStyle(panel).display,
      panelWidth: Math.round(panel.getBoundingClientRect().width),
      panelGrid: getComputedStyle(panel).gridColumn,
      resultsGrid: getComputedStyle(results).gridColumn,
      resultsClient: results.clientWidth,
      resultsScroll: results.scrollWidth,
      wrapClient: wrap.clientWidth,
      wrapScroll: wrap.scrollWidth,
      overflowing,
      shaftDisplay: shaft ? getComputedStyle(shaft).display : null,
      rangeH: [...document.querySelectorAll(".catalog-range-head")].map((h) =>
        Math.round(h.getBoundingClientRect().height),
      ),
      speedReadout: [...document.querySelectorAll(".catalog-range-value")].map(
        (el) => el.textContent?.trim(),
      ),
    };
  });
  console.log(JSON.stringify({ width, ...row }));
}

await browser.close();
