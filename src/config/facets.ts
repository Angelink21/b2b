import { getCatalogColumns } from "@/config/columns";
import {
  CATEGORY_DEFS,
  getCategoryDef,
  type CategoryFacetId,
  type CategorySlug,
} from "@/config/categories";
import {
  SORT_BY_TO_COLUMN,
  type SortParam,
} from "@/lib/catalog/search-params";

export {
  DIMENSION_FILTER_CATEGORIES,
  dimensionFilterAllowed,
} from "@/config/dimension-facets";

/** Filters that can appear in the catalog URL. Boiler is intentionally absent. */
export const RANGE_FACETS = ["kg", "power", "width", "speed", "volume"] as const;

export type RangeFacet = (typeof RANGE_FACETS)[number];
export type FacetId = CategoryFacetId;

export const FACETS_BY_CATEGORY = Object.fromEntries(
  CATEGORY_DEFS.map((d) => [d.slug, d.facets]),
) as unknown as Record<CategorySlug, readonly FacetId[]>;

/** All categories: chips and search are always on; only heating is an extra facet. */
export const FACETS_WHEN_ALL: readonly FacetId[] = ["heating"];

export function facetsForCategory(
  category: CategorySlug | null,
): readonly FacetId[] {
  if (!category) return FACETS_WHEN_ALL;
  return getCategoryDef(category)?.facets ?? FACETS_WHEN_ALL;
}

export function facetAllowed(
  category: CategorySlug | null,
  facet: FacetId,
): boolean {
  return facetsForCategory(category).includes(facet);
}

export function sortAllowed(
  category: CategorySlug | null,
  sort: SortParam | null,
): boolean {
  if (!sort) return true;
  const column = SORT_BY_TO_COLUMN[sort.by];
  return getCatalogColumns(category).some((def) => def.id === column);
}
