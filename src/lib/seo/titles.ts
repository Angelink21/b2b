import { getAll } from "@/lib/catalog";
import { CATEGORY_SLUGS } from "@/lib/catalog/schema";
import type { AppLocale } from "@/i18n/routing";

import { seoMessages } from "./messages";
import { buildProductDescription } from "./product-copy";

export type PageTitleRecord = {
  locale: AppLocale;
  path: string;
  title: string;
  description: string;
};

/**
 * All public indexable page titles/descriptions for uniqueness tests (S1).
 * Datasheet / styleguide / fontcheck are excluded.
 */
export function collectPublicPageMeta(
  locale: AppLocale,
): PageTitleRecord[] {
  const messages = seoMessages(locale);
  const meta = messages.meta;
  const categories = messages.categories;
  const heating = messages.heating;
  const units = messages.units;
  const records: PageTitleRecord[] = [
    {
      locale,
      path: `/${locale}`,
      title: meta.homeTitle,
      description: meta.homeDescription,
    },
    {
      locale,
      path: `/${locale}/catalog`,
      title: meta.catalogTitle,
      description: meta.catalogDescription,
    },
    {
      locale,
      path: `/${locale}/compare`,
      title: meta.compareTitle,
      description: meta.compareDescription,
    },
    {
      locale,
      path: `/${locale}/quote`,
      title: meta.quoteTitle,
      description: meta.quoteDescription,
    },
    {
      locale,
      path: `/${locale}/privacy`,
      title: meta.privacyTitle,
      description: meta.privacyDescription,
    },
  ];

  for (const category of CATEGORY_SLUGS) {
    const categoryLabel = categories[category];
    records.push({
      locale,
      path: `/${locale}/catalog/${category}`,
      title: categoryLabel,
      description: meta.categoryDescription.replace("{category}", categoryLabel),
    });
  }

  for (const product of getAll()) {
    const heatingLabel = product.heating
      ? heating[product.heating as keyof typeof heating]
      : null;
    records.push({
      locale,
      path: `/${locale}/catalog/${product.category}/${product.slug}`,
      title: product.name,
      description: buildProductDescription(product, {
        category: categories[product.category],
        heating: heatingLabel ?? null,
        units,
      }),
    });
  }

  return records;
}
