import { describe, expect, it } from "vitest";

import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import { getAll } from "@/lib/catalog";
import { CATEGORY_SLUGS } from "@/lib/catalog/schema";
import { routing } from "@/i18n/routing";

describe("sitemap and robots (S2)", () => {
  it("includes all public pages for both locales and excludes datasheet/styleguide", () => {
    const entries = sitemap();
    const urls = entries.map((e) => e.url);

    const staticPerLocale = 5; // home, catalog, compare, quote, privacy
    const categoriesPerLocale = CATEGORY_SLUGS.length;
    const modelsPerLocale = getAll().length;
    const expected =
      routing.locales.length *
      (staticPerLocale + categoriesPerLocale + modelsPerLocale);

    expect(entries).toHaveLength(expected);

    for (const url of urls) {
      expect(url).not.toMatch(/datasheet/);
      expect(url).not.toMatch(/_styleguide/);
      expect(url).not.toMatch(/fontcheck/);
    }

    expect(urls.some((u) => u.endsWith("/uk"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/en/catalog"))).toBe(true);
  });

  it("robots disallow styleguide and fontcheck and point to sitemap", () => {
    const doc = robots();
    const rules = Array.isArray(doc.rules) ? doc.rules[0] : doc.rules;
    const disallow = rules?.disallow;
    const list = Array.isArray(disallow)
      ? disallow
      : disallow
        ? [disallow]
        : [];
    expect(list.some((d) => String(d).includes("_styleguide"))).toBe(true);
    expect(list.some((d) => String(d).includes("fontcheck"))).toBe(true);
    expect(String(doc.sitemap)).toMatch(/sitemap\.xml$/);
  });
});
