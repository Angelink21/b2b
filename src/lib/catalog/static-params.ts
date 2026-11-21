/**
 * Static params for model routes — always from the build snapshot.
 * Runtime `getCatalog()` may add/remove models later; new slugs render on
 * first request (default `dynamicParams`), removed slugs hit `notFound()`.
 */

import { routing } from "@/i18n/routing";

import { getSnapshotAll } from "./index";

export type ModelStaticParam = {
  locale: string;
  category: string;
  slug: string;
};

/** locale × category × slug from `catalog.generated.json` (no network). */
export function buildModelStaticParams(): ModelStaticParam[] {
  const products = getSnapshotAll();
  return routing.locales.flatMap((locale) =>
    products.map((product) => ({
      locale,
      category: product.category,
      slug: product.slug,
    })),
  );
}
