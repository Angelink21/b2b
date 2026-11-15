/**
 * P5 acceptance screenshots — run against a live server:
 *   BASE_URL=http://localhost:3000 node scripts/p5-screenshots.mjs
 */
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const base = process.env.BASE_URL ?? "http://localhost:3000";
const outDir = path.resolve("docs/qa/p5");

const pages = [
  { id: "home", path: "/uk" },
  { id: "catalog", path: "/uk/catalog" },
  { id: "category", path: "/uk/catalog/washers" },
  { id: "model", path: "/uk/catalog/washers/haier-hcw12cbd" },
  { id: "compare", path: "/uk/compare?m=haier-hcw12cbd,lap-08-tp2-e-v" },
  { id: "quote", path: "/uk/quote" },
  { id: "about", path: "/uk/about" },
  { id: "service", path: "/uk/service" },
  { id: "contacts", path: "/uk/contacts" },
  { id: "privacy", path: "/uk/privacy" },
  { id: "notfound", path: "/uk/does-not-exist-p5" },
];

const viewports = [
  { id: "1440", width: 1440, height: 900 },
  { id: "1024", width: 1024, height: 900 },
  { id: "390", width: 390, height: 844 },
];

const themes = ["light", "dark"];

async function setTheme(page, theme) {
  await page.evaluate((value) => {
    document.documentElement.setAttribute("data-theme", value);
    try {
      localStorage.setItem("theme", value);
    } catch {
      /* ignore */
    }
  }, theme);
}

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

for (const vp of viewports) {
  await page.setViewportSize({ width: vp.width, height: vp.height });
  for (const theme of themes) {
    for (const entry of pages) {
      await page.goto(`${base}${entry.path}`, { waitUntil: "networkidle" });
      await setTheme(page, theme);
      await page.waitForTimeout(200);
      const file = path.join(outDir, `${entry.id}-${theme}-${vp.id}.png`);
      await page.screenshot({ path: file, fullPage: false });
      console.log(file);
    }

    // Desktop mega-menu / mobile menu
    await page.goto(`${base}/uk`, { waitUntil: "networkidle" });
    await setTheme(page, theme);
    if (vp.width >= 1024) {
      const catalogBtn = page.getByRole("button", { name: /Каталог|Catalog/i }).first();
      if (await catalogBtn.count()) {
        await catalogBtn.click();
        await page.waitForTimeout(250);
        const file = path.join(outDir, `menu-mega-${theme}-${vp.id}.png`);
        await page.screenshot({ path: file, fullPage: false });
        console.log(file);
        await page.keyboard.press("Escape");
      }
    } else {
      const menuBtn = page.getByRole("button", { name: /Меню|Menu/i }).first();
      if (await menuBtn.count()) {
        await menuBtn.click();
        await page.waitForTimeout(250);
        const file = path.join(outDir, `menu-mobile-${theme}-${vp.id}.png`);
        await page.screenshot({ path: file, fullPage: false });
        console.log(file);
        await page.keyboard.press("Escape");
      }
    }
  }
}

await browser.close();
console.log("done");
