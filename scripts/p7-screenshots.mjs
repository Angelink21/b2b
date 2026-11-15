/**
 * P7 catalog table layout screenshots — run against a live server:
 *   BASE_URL=http://127.0.0.1:3000 PHASE=before node scripts/p7-screenshots.mjs
 */
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const base = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const phase = process.env.PHASE ?? "before";
const outDir = path.resolve("docs/qa/p7");

const pages = [
  { id: "washers", path: "/uk/catalog/washers" },
  { id: "catalog", path: "/uk/catalog" },
];

const viewports = [
  { id: "1280", width: 1280, height: 900 },
  { id: "1440", width: 1440, height: 900 },
];

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();

for (const vp of viewports) {
  await page.setViewportSize({ width: vp.width, height: vp.height });
  for (const entry of pages) {
    await page.goto(`${base}${entry.path}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".catalog-model-link", { timeout: 20_000 });
    await page.waitForTimeout(300);
    const file = path.join(outDir, `${phase}-${entry.id}-${vp.id}.png`);
    await page.screenshot({ path: file, fullPage: false });
    console.log(file);
  }
}

await browser.close();
