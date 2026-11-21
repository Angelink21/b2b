import type { FacetId, RangeFacet } from "@/config/facets";

import {
  dimensionFilterActive,
  itemMatchesDimensionFilter,
  type DimensionMaxFilter,
} from "./dimension-filter";
import { indexKeyMetricSortValue } from "./format";
import {
  CATEGORY_SLUGS,
  type CatalogIndexItem,
  type CategorySlug,
  type HeatingKey,
} from "./schema";

/** Natural model-name order (LA-11 before LA-100C). */
export const catalogNameCollator = new Intl.Collator("uk", {
  numeric: true,
  sensitivity: "base",
});

export function compareCatalogNames(a: string, b: string): number {
  return catalogNameCollator.compare(a, b);
}

const CATEGORY_ORDER = new Map(
  CATEGORY_SLUGS.map((slug, index) => [slug, index]),
);

/** Default table order: key metric ascending (then name). */
export function defaultCatalogSort(
  category: CategorySlug | null | undefined,
): CatalogSort {
  switch (category) {
    case "washers":
    case "dryers":
    case "washer-dryers":
      return { by: "kg", dir: "asc" };
    case "flatwork-ironers":
    case "ironing-rollers":
      return { by: "width", dir: "asc" };
    case "laundry-carts":
    case "water-recovery":
      return { by: "volume", dir: "asc" };
    case "finishing":
      return { by: "power", dir: "asc" };
    default:
      return { by: "key", dir: "asc" };
  }
}

export type NumberRange = { min?: number; max?: number };

export type CatalogFilter = {
  category?: CategorySlug | CategorySlug[];
  heating?: HeatingKey | HeatingKey[];
  /** Inclusive kg range; matches products whose [min,max] overlaps. */
  kg?: NumberRange;
  power?: NumberRange;
  width?: NumberRange;
  speed?: NumberRange;
  volume?: NumberRange;
  /** Maximum overall dimensions (Ш×Г×В), mm. */
  dimensionsMax?: DimensionMaxFilter;
  q?: string;
  /**
   * When set, a range or heating value is applied only if its facet is listed.
   * Omitted means every provided filter applies (existing callers).
   */
  allowed?: readonly FacetId[];
};

export type CatalogSort =
  | { by: "name"; dir: "asc" | "desc" }
  | { by: "kg"; dir: "asc" | "desc" }
  | { by: "power"; dir: "asc" | "desc" }
  | { by: "width"; dir: "asc" | "desc" }
  | { by: "speed"; dir: "asc" | "desc" }
  | { by: "volume"; dir: "asc" | "desc" }
  | { by: "gFactor"; dir: "asc" | "desc" }
  | { by: "spinRpm"; dir: "asc" | "desc" }
  | { by: "shaft"; dir: "asc" | "desc" }
  | { by: "key"; dir: "asc" | "desc" };

/** Normalize for search: lower-case, collapse spaces, treat - and / as spaces. */
export function normalizeSearchQuery(input: string): string {
  return input
    .toLowerCase()
    .replace(/[-/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function asArray<T>(value: T | T[] | undefined): T[] | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value : [value];
}

function facetOn(filter: CatalogFilter, facet: FacetId): boolean {
  if (!filter.allowed) return true;
  return filter.allowed.includes(facet);
}

function covers(span: { min: number; max: number } | null, range: NumberRange): boolean {
  if (!span) return false;
  const lo = range.min ?? Number.NEGATIVE_INFINITY;
  const hi = range.max ?? Number.POSITIVE_INFINITY;
  return span.max >= lo && span.min <= hi;
}

function coversPoint(value: number | null, range: NumberRange): boolean {
  if (value === null) return false;
  const lo = range.min ?? Number.NEGATIVE_INFINITY;
  const hi = range.max ?? Number.POSITIVE_INFINITY;
  return value >= lo && value <= hi;
}

export function facetRangeBounds(
  items: readonly CatalogIndexItem[],
  facet: RangeFacet,
): { min: number; max: number } | null {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (const item of items) {
    const span = spanOf(item, facet);
    if (!span) continue;
    min = Math.min(min, span.min);
    max = Math.max(max, span.max);
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  return { min, max };
}

function spanOf(
  item: CatalogIndexItem,
  facet: RangeFacet,
): { min: number; max: number } | null {
  switch (facet) {
    case "kg":
      return item.loadKg;
    case "power":
      return item.powerKwMax === null
        ? null
        : { min: item.powerKwMax, max: item.powerKwMax };
    case "width":
      return item.workingWidthMm === null
        ? null
        : { min: item.workingWidthMm, max: item.workingWidthMm };
    case "speed":
      return item.workingSpeedMpm;
    case "volume":
      return item.volumeL === null
        ? null
        : { min: item.volumeL, max: item.volumeL };
    default:
      return null;
  }
}

export function filterProducts<T extends CatalogIndexItem>(
  items: readonly T[],
  filter: CatalogFilter,
): T[] {
  const categories = asArray(filter.category);
  const heatings = asArray(filter.heating);
  const q = filter.q ? normalizeSearchQuery(filter.q) : "";

  return items.filter((item) => {
    if (categories && categories.length > 0 && !categories.includes(item.category)) {
      return false;
    }
    if (heatings && heatings.length > 0 && facetOn(filter, "heating")) {
      if (item.heating === null || !heatings.includes(item.heating)) {
        return false;
      }
    }
    if (filter.kg && facetOn(filter, "kg") && !covers(item.loadKg, filter.kg)) {
      return false;
    }
    if (
      filter.power &&
      facetOn(filter, "power") &&
      !coversPoint(item.powerKwMax, filter.power)
    ) {
      return false;
    }
    if (
      filter.width &&
      facetOn(filter, "width") &&
      !coversPoint(item.workingWidthMm, filter.width)
    ) {
      return false;
    }
    if (
      filter.speed &&
      facetOn(filter, "speed") &&
      !covers(item.workingSpeedMpm, filter.speed)
    ) {
      return false;
    }
    if (
      filter.volume &&
      facetOn(filter, "volume") &&
      !coversPoint(item.volumeL, filter.volume)
    ) {
      return false;
    }
    if (
      filter.dimensionsMax &&
      dimensionFilterActive(filter.dimensionsMax) &&
      !itemMatchesDimensionFilter(item, filter.dimensionsMax)
    ) {
      return false;
    }
    if (q) {
      const hay = normalizeSearchQuery(item.name);
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export type SortProductsOptions = {
  /** Menu order of categories first (All view default). */
  groupByCategory?: boolean;
};

export function sortProducts<T extends CatalogIndexItem>(
  items: readonly T[],
  sort: CatalogSort,
  options?: SortProductsOptions,
): T[] {
  const dir = sort.dir === "asc" ? 1 : -1;
  const groupByCategory = options?.groupByCategory === true;
  const copy = [...items];

  copy.sort((a, b) => {
    if (groupByCategory) {
      const ai = CATEGORY_ORDER.get(a.category) ?? 999;
      const bi = CATEGORY_ORDER.get(b.category) ?? 999;
      if (ai !== bi) return ai - bi;
    }

    const num = (av: number, bv: number) => {
      if (av === bv) return 0;
      return (av - bv) * dir;
    };

    let primary = 0;
    switch (sort.by) {
      case "name":
        primary = compareCatalogNames(a.name, b.name) * dir;
        break;
      case "kg":
        primary = num(a.loadKg?.max ?? -1, b.loadKg?.max ?? -1);
        break;
      case "power":
        primary = num(a.powerKwMax ?? -1, b.powerKwMax ?? -1);
        break;
      case "width":
        primary = num(a.workingWidthMm ?? -1, b.workingWidthMm ?? -1);
        break;
      case "speed":
        primary = num(
          a.workingSpeedMpm?.max ?? -1,
          b.workingSpeedMpm?.max ?? -1,
        );
        break;
      case "volume":
        primary = num(a.volumeL ?? -1, b.volumeL ?? -1);
        break;
      case "gFactor":
        primary = num(a.gFactor ?? -1, b.gFactor ?? -1);
        break;
      case "spinRpm":
        primary = num(a.spinRpm ?? -1, b.spinRpm ?? -1);
        break;
      case "shaft":
        primary = num(a.shaftDiameterMm ?? -1, b.shaftDiameterMm ?? -1);
        break;
      case "key":
        primary = num(
          indexKeyMetricSortValue(a) ?? -1,
          indexKeyMetricSortValue(b) ?? -1,
        );
        break;
      default:
        primary = 0;
    }

    if (primary !== 0) return primary;
    if (sort.by === "name") return 0;
    return compareCatalogNames(a.name, b.name);
  });

  return copy;
}

export function searchProducts<T extends CatalogIndexItem>(
  items: readonly T[],
  q: string,
): T[] {
  return filterProducts(items, { q });
}
