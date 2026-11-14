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

function loadCatalog(): CatalogData {
  if (cachedCatalog) return cachedCatalog;
  cachedCatalog = generated as CatalogData;
  return cachedCatalog;
}

function loadIndex(): IndexData {
  if (cachedIndex) return cachedIndex;
  cachedIndex = indexJson as IndexData;
  return cachedIndex;
}

/** Test/build helper: inject catalog without reading disk. */
export function __setCatalogForTests(data: CatalogData | null): void {
  cachedCatalog = data;
}

export function __setIndexForTests(data: IndexData | null): void {
  cachedIndex = data;
}

export function getAll(): Product[] {
  return loadCatalog().products;
}

export function getSeriesAll(): Series[] {
  return loadCatalog().series;
}

export function getSeriesById(id: string): Series | undefined {
  return loadCatalog().series.find((s) => s.id === id);
}

export function getBySlug(slug: string): Product | undefined {
  return loadCatalog().products.find((p) => p.slug === slug);
}

export function getByCategory(category: CategorySlug): Product[] {
  return loadCatalog().products.filter((p) => p.category === category);
}

export function getFamily(familyId: string): Product[] {
  return loadCatalog().products.filter((p) => p.familyId === familyId);
}

/**
 * Related models: same category, nearest by loadKg.max (or power if no kg),
 * excluding the same family. Returns up to `n` items.
 */
export function getRelated(slug: string, n: number): Product[] {
  const all = loadCatalog().products;
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
  const list = items ?? loadIndex().products;
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

export function getIndex(): CatalogIndexItem[] {
  return loadIndex().products;
}

export { filterProducts };
