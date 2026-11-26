import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const CYRILLIC = /[\u0400-\u04FF]/u;
const BRAND = "Fagor Professional";
const UK_ONLY_NOTE = "Description is available in Ukrainian only";

type CatalogGenerated = {
  products: Array<{ name: string; slug: string; category: string }>;
};

function loadCatalog(): CatalogGenerated {
  const file = path.join(
    process.cwd(),
    "src",
    "data",
    "catalog.generated.json",
  );
  return JSON.parse(fs.readFileSync(file, "utf8")) as CatalogGenerated;
}

function collectAllowedModelNames(catalog: CatalogGenerated): Set<string> {
  return new Set(catalog.products.map((p) => p.name));
}

/**
 * Visible text must not contain Cyrillic except:
 * - brand name
 * - model names
 * - Ukrainian-only note
 * - text inside [lang="uk"] (fallback series copy)
 */
async function assertNoUnexpectedCyrillic(
  page: import("@playwright/test").Page,
  allowedNames: Set<string>,
) {
  const payload = await page.evaluate(() => {
    const ukRoots = Array.from(document.querySelectorAll('[lang="uk"]'));
    const ukTexts = ukRoots.map((el) => (el.textContent ?? "").trim());
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
    );
    const chunks: string[] = [];
    let node = walker.nextNode();
    while (node) {
      const parent = node.parentElement;
      if (
        parent &&
        (parent.closest('[lang="uk"]') ||
          parent.closest("script") ||
          parent.closest("style") ||
          parent.closest("[hidden]"))
      ) {
        node = walker.nextNode();
        continue;
      }
      const text = (node.textContent ?? "").replace(/\s+/g, " ").trim();
      if (text) chunks.push(text);
      node = walker.nextNode();
    }
    return { chunks, ukTexts };
  });

  const allowedFragments = new Set<string>([BRAND, UK_ONLY_NOTE, ...allowedNames]);

  for (const chunk of payload.chunks) {
    if (!CYRILLIC.test(chunk)) continue;
    // Allow if the whole chunk is an allowed fragment or only contains allowed names/brand/note
    let remainder = chunk;
    for (const frag of allowedFragments) {
      if (!frag) continue;
      remainder = remainder.split(frag).join(" ");
    }
    remainder = remainder.replace(/\s+/g, " ").trim();
    expect(
      remainder,
      `Unexpected Cyrillic in visible text: ${JSON.stringify(chunk)}`,
    ).not.toMatch(CYRILLIC);
  }
}

test.describe("en locale has no unexpected Cyrillic", () => {
  const catalog = loadCatalog();
  const allowedNames = collectAllowedModelNames(catalog);
  const sample = catalog.products[0]!;

  const paths = [
    "/en",
    "/en/catalog",
    `/en/catalog/${sample.category}/${sample.slug}`,
    "/en/about",
    "/en/service",
    "/en/contacts",
    "/en/privacy",
  ];

  for (const pathName of paths) {
    test(`${pathName}`, async ({ page }) => {
      await page.goto(pathName);
      await expect(page.locator("main")).toBeVisible();
      await assertNoUnexpectedCyrillic(page, allowedNames);
    });
  }

  test("uk model page still shows Ukrainian description without en-only note", async ({
    page,
  }) => {
    await page.goto(`/uk/catalog/${sample.category}/${sample.slug}`);
    await expect(page.locator("main")).toBeVisible();
    const note = page.getByText(UK_ONLY_NOTE);
    await expect(note).toHaveCount(0);
  });

  test("model page keeps hreflang and canonical", async ({ page }) => {
    const urlPath = `/en/catalog/${sample.category}/${sample.slug}`;
    await page.goto(urlPath);
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute("href", new RegExp(urlPath));
    await expect(page.locator('link[hreflang="uk"]')).toHaveCount(1);
    await expect(page.locator('link[hreflang="en"]')).toHaveCount(1);
    await expect(page.locator('link[hreflang="x-default"]')).toHaveCount(1);
  });
});
