/**
 * Async catalog accessors backed by runtime `getCatalog()` (`'use cache'`).
 * Server-only — import from here in RSC / route handlers, not from client islands.
 */

import { cache } from "react";

import {
  buildCategorySummary,
  type CategorySummary,
} from "./category-summary";
import { getCatalog } from "./get-catalog";
import { buildCategoryNavStats, type CategoryNavStat } from "./nav";
import type {
  CatalogIndexItem,
  CategorySlug,
  Product,
  Series,
} from "./schema";
import type { CatalogRuntimeResult } from "./runtime";
import { filterProducts } from "./query";

/** Per-request memo of the cached catalog result. */
export const getCatalogResult = cache(
  async (): Promise<CatalogRuntimeResult> => getCatalog(),
);

type CatalogMaps = {
  result: CatalogRuntimeResult;
  bySlug: Map<string, Product>;
  byCategory: Map<CategorySlug, Product[]>;
  byFamily: Map<string, Product[]>;
  bySeries: Map<string, Series>;
};

const getCatalogMaps = cache(async (): Promise<CatalogMaps> => {
  const result = await getCatalogResult();
  const bySlug = new Map<string, Product>();
  const byCategory = new Map<CategorySlug, Product[]>();
  const byFamily = new Map<string, Product[]>();
  const bySeries = new Map<string, Series>();

  for (const series of result.data.series) {
    bySeries.set(series.id, series);
  }

  for (const product of result.data.products) {
    bySlug.set(product.slug, product);

    const catList = byCategory.get(product.category) ?? [];
    catList.push(product);
    byCategory.set(product.category, catList);

    const famList = byFamily.get(product.familyId) ?? [];
    famList.push(product);
    byFamily.set(product.familyId, famList);
  }

  return { result, bySlug, byCategory, byFamily, bySeries };
});

export async function getAll(): Promise<Product[]> {
  const { result } = await getCatalogMaps();
  return result.data.products;
}

export async function getSeriesAll(): Promise<Series[]> {
  const { result } = await getCatalogMaps();
  return result.data.series;
}

export async function getSeriesById(id: string): Promise<Series | undefined> {
  const { bySeries } = await getCatalogMaps();
  return bySeries.get(id);
}

export async function getBySlug(slug: string): Promise<Product | undefined> {
  const { bySlug } = await getCatalogMaps();
  return bySlug.get(slug);
}

export async function getByCategory(
  category: CategorySlug,
): Promise<Product[]> {
  const { byCategory } = await getCatalogMaps();
  return byCategory.get(category) ?? [];
}

export async function getFamily(familyId: string): Promise<Product[]> {
  const { byFamily } = await getCatalogMaps();
  return byFamily.get(familyId) ?? [];
}

/**
 * Related models: same category, nearest by loadKg.max (or power if no kg),
 * excluding the same family. Returns up to `n` items.
 */
export async function getRelated(slug: string, n: number): Promise<Product[]> {
  const { result, bySlug } = await getCatalogMaps();
  const self = bySlug.get(slug);
  if (!self || n <= 0) return [];

  const anchor = self.loadKg?.max ?? self.powerKw?.max ?? 0;

  return result.data.products
    .filter(
      (p) =>
        p.slug !== self.slug &&
        p.category === self.category &&
        p.familyId !== self.familyId,
    )
    .map((p) => ({
      product: p,
      distance: Math.abs((p.loadKg?.max ?? p.powerKw?.max ?? 0) - anchor),
    }))
    .sort(
      (a, b) =>
        a.distance - b.distance ||
        a.product.name.localeCompare(b.product.name, "uk"),
    )
    .slice(0, n)
    .map((x) => x.product);
}

export async function getIndex(): Promise<CatalogIndexItem[]> {
  const { result } = await getCatalogMaps();
  return result.data.index;
}

export async function getCategoryNavStats(): Promise<CategoryNavStat[]> {
  return buildCategoryNavStats(await getIndex());
}

export async function getCategorySummary(
  slug: CategorySlug,
): Promise<CategorySummary> {
  return buildCategorySummary(slug, await getIndex());
}

export { filterProducts };
export type { CategoryNavStat };
