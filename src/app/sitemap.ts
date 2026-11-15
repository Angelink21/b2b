import type { MetadataRoute } from "next";

import { getAll } from "@/lib/catalog";
import { CATEGORY_SLUGS } from "@/lib/catalog/schema";
import { absoluteUrl, languageAlternates } from "@/lib/seo/paths";
import { routing } from "@/i18n/routing";

/**
 * Public indexable routes only.
 * Excluded: _styleguide, fontcheck, datasheet (noindex / internal).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const products = getAll();
  const staticPaths = [
    "",
    "/catalog",
    "/compare",
    "/quote",
    "/privacy",
    "/about",
    "/service",
    "/contacts",
  ] as const;
  const categoryPaths = CATEGORY_SLUGS.map((c) => `/catalog/${c}`);
  const modelPaths = products.map(
    (p) => `/catalog/${p.category}/${p.slug}` as const,
  );
  const paths = [...staticPaths, ...categoryPaths, ...modelPaths];

  const entries: MetadataRoute.Sitemap = [];

  for (const path of paths) {
    for (const locale of routing.locales) {
      entries.push({
        url: absoluteUrl(locale, path),
        alternates: {
          languages: languageAlternates(path),
        },
      });
    }
  }

  return entries;
}
