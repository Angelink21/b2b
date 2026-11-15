import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const LOCALES = ["uk", "en"] as const;
const THEMES = ["light", "dark"] as const;

/** One URL per page type used in acceptance. */
const PAGE_TYPES: Array<{ id: string; path: (locale: string) => string }> = [
  { id: "home", path: (locale) => `/${locale}` },
  { id: "catalog", path: (locale) => `/${locale}/catalog` },
  { id: "category", path: (locale) => `/${locale}/catalog/washers` },
  {
    id: "model",
    path: (locale) => `/${locale}/catalog/washers/haier-hcw12cbd`,
  },
  { id: "compare", path: (locale) => `/${locale}/compare?m=haier-hcw12cbd` },
  { id: "quote", path: (locale) => `/${locale}/quote` },
  { id: "privacy", path: (locale) => `/${locale}/privacy` },
  { id: "about", path: (locale) => `/${locale}/about` },
  { id: "service", path: (locale) => `/${locale}/service` },
  { id: "contacts", path: (locale) => `/${locale}/contacts` },
];

async function setTheme(page: Page, theme: "light" | "dark"): Promise<void> {
  await page.evaluate((value) => {
    localStorage.setItem("fagor-theme", value);
    document.documentElement.setAttribute("data-theme", value);
  }, theme);
  await page.reload();
}

test.describe("a11y matrix (axe × theme × locale)", () => {
  // Chromium only: full matrix × 3 projects would be hundreds of axe runs.
  for (const locale of LOCALES) {
    for (const theme of THEMES) {
      for (const pageType of PAGE_TYPES) {
        test(`${pageType.id} ${locale} ${theme}`, async ({
          page,
        }, testInfo) => {
          test.skip(
            testInfo.project.name !== "chromium",
            "matrix once on chromium",
          );
          await page.goto(pageType.path(locale));
          await setTheme(page, theme);
          await expect(page.getByRole("main")).toBeVisible();
          const results = await new AxeBuilder({ page }).analyze();
          expect(results.violations).toEqual([]);
        });
      }
    }
  }
});
