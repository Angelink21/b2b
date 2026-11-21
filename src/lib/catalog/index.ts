/**
 * Build-snapshot catalog accessors (sync).
 * Runtime pages should use `@/lib/catalog/queries` (async `getCatalog()`).
 * `generateStaticParams` must keep using these snapshot helpers.
 */

import generated from "@/data/catalog.generated.json";
import indexJson from "@/data/catalog.index.json";

import type {
  CatalogGenerated,
  CatalogIndex,
  CatalogIndexItem,
  CategorySlug,
  Product,
  Series,
} from "./schema";
import { filterProducts } from "./query";

type CatalogData = CatalogGenerated;
type IndexData = CatalogIndex;

let cachedCatalog: CatalogData | null = null;
let cachedIndex: IndexData | null = null;

function loadSnapshotCatalog(): CatalogData {
  if (cachedCatalog) return cachedCatalog;
  cachedCatalog = generated as CatalogData;
  return cachedCatalog;
}

function loadSnapshotIndex(): IndexData {
  if (cachedIndex) return cachedIndex;
  cachedIndex = indexJson as IndexData;
  return cachedIndex;
}

/** Test helper: inject snapshot catalog without reading disk. */
export function __setCatalogForTests(data: CatalogData | null): void {
  cachedCatalog = data;
}

export function __setIndexForTests(data: IndexData | null): void {
  cachedIndex = data;
}

export function getSnapshotAll(): Product[] {
  return loadSnapshotCatalog().products;
}

export function getSnapshotSeriesAll(): Series[] {
  return loadSnapshotCatalog().series;
}

export function getSnapshotSeriesById(id: string): Series | undefined {
  return loadSnapshotCatalog().series.find((s) => s.id === id);
}

export function getSnapshotBySlug(slug: string): Product | undefined {
  return loadSnapshotCatalog().products.find((p) => p.slug === slug);
}

export function getSnapshotByCategory(category: CategorySlug): Product[] {
  return loadSnapshotCatalog().products.filter((p) => p.category === category);
}

export function getSnapshotFamily(familyId: string): Product[] {
  return loadSnapshotCatalog().products.filter((p) => p.familyId === familyId);
}

export function getSnapshotRelated(slug: string, n: number): Product[] {
  const all = loadSnapshotCatalog().products;
  const self = all.find((p) => p.slug === slug);
  if (!self || n <= 0) return [];

  const anchor = self.loadKg?.max ?? self.powerKw?.max ?? 0;

  return all
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

export type Facets = {
  categories: Partial<Record<CategorySlug, number>>;
  heating: Record<string, number>;
  kg: { min: number; max: number } | null;
  count: number;
};

export function facets(items?: readonly CatalogIndexItem[]): Facets {
  const list = items ?? loadSnapshotIndex().products;
  const categories: Partial<Record<CategorySlug, number>> = {};
  const heating: Record<string, number> = {};
  let kgMin = Number.POSITIVE_INFINITY;
  let kgMax = Number.NEGATIVE_INFINITY;

  for (const item of list) {
    categories[item.category] = (categories[item.category] ?? 0) + 1;
    const heatKey = item.heating ?? "none";
    heating[heatKey] = (heating[heatKey] ?? 0) + 1;
    if (item.loadKg) {
      kgMin = Math.min(kgMin, item.loadKg.min);
      kgMax = Math.max(kgMax, item.loadKg.max);
    }
  }

  return {
    categories,
    heating,
    kg:
      Number.isFinite(kgMin) && Number.isFinite(kgMax)
        ? { min: kgMin, max: kgMax }
        : null,
    count: list.length,
  };
}

export function getSnapshotIndex(): CatalogIndexItem[] {
  return loadSnapshotIndex().products;
}

export { filterProducts };

/**
 * Runtime `getCatalog()`: `@/lib/catalog/get-catalog` (server-only).
 * Async accessors: `@/lib/catalog/queries`.
 */
export type {
  CatalogRuntimeData,
  CatalogRuntimeMeta,
  CatalogRuntimeResult,
  CatalogRuntimeSource,
} from "./runtime";
