import { dimensionFilterAllowed } from "@/config/dimension-facets";
import type { CatalogIndexItem, CategorySlug } from "@/lib/catalog/schema";

export type DimensionMaxFilter = {
  w?: number;
  d?: number;
  h?: number;
};

export function hasCatalogDimensions(item: CatalogIndexItem): boolean {
  const { w, d, h } = item.dimensionsMm;
  return [w, d, h].every((n) => Number.isFinite(n) && n > 0);
}

function withinMax(value: number, max: number | undefined): boolean {
  if (max === undefined) return true;
  return value <= max;
}

/** True when any max bound is a finite positive number. */
export function dimensionFilterActive(filter: DimensionMaxFilter): boolean {
  return [filter.w, filter.d, filter.h].some(
    (n) => n !== undefined && Number.isFinite(n) && n > 0,
  );
}

export function itemMatchesDimensionFilter(
  item: CatalogIndexItem,
  filter: DimensionMaxFilter,
): boolean {
  if (!dimensionFilterActive(filter)) return true;
  if (!hasCatalogDimensions(item)) return false;
  const { w, d, h } = item.dimensionsMm;
  return (
    withinMax(w, filter.w) &&
    withinMax(d, filter.d) &&
    withinMax(h, filter.h)
  );
}

export function countHiddenWithoutDimensions(
  items: readonly CatalogIndexItem[],
  filter: DimensionMaxFilter,
): number {
  if (!dimensionFilterActive(filter)) return 0;
  return items.filter((item) => !hasCatalogDimensions(item)).length;
}

export function scrubDimensionParams(
  category: CategorySlug | null,
  filter: DimensionMaxFilter,
): DimensionMaxFilter {
  if (dimensionFilterAllowed(category)) return filter;
  return {};
}