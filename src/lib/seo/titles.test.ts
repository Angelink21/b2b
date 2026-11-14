import { describe, expect, it } from "vitest";

import { routing } from "@/i18n/routing";
import { collectPublicPageMeta } from "./titles";

describe("public page titles (S1)", () => {
  for (const locale of routing.locales) {
    it(`${locale}: every public page has a unique title`, () => {
      const pages = collectPublicPageMeta(locale);
      const titles = pages.map((p) => p.title);
      const unique = new Set(titles);
      if (unique.size !== titles.length) {
        const seen = new Map<string, string>();
        const dupes: string[] = [];
        for (const page of pages) {
          const prev = seen.get(page.title);
          if (prev) {
            dupes.push(`${page.title}: ${prev} and ${page.path}`);
          } else {
            seen.set(page.title, page.path);
          }
        }
        expect.fail(`duplicate titles:\n${dupes.slice(0, 20).join("\n")}`);
      }
      expect(pages.length).toBeGreaterThan(300);
    });

    it(`${locale}: every public page has a unique description`, () => {
      const pages = collectPublicPageMeta(locale);
      const descriptions = pages.map((p) => p.description);
      const unique = new Set(descriptions);
      if (unique.size !== descriptions.length) {
        const seen = new Map<string, string>();
        const dupes: string[] = [];
        for (const page of pages) {
          const prev = seen.get(page.description);
          if (prev) {
            dupes.push(`${prev} and ${page.path}`);
          } else {
            seen.set(page.description, page.path);
          }
        }
        expect.fail(
          `duplicate descriptions (${dupes.length}):\n${dupes.slice(0, 15).join("\n")}`,
        );
      }
    });
  }
});
