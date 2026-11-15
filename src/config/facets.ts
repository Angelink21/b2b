import { getCatalogColumns } from "@/config/columns";
import type { CategorySlug } from "@/lib/catalog/schema";
import {
  SORT_BY_TO_COLUMN,
  type SortParam,
} from "@/lib/catalog/search-params";

/** Filters that can appear in the catalog URL. Boiler is intentionally absent. */
export const RANGE_FACETS = ["kg", "power", "width", "speed", "volume"] as const;

export type RangeFacet = (typeof RANGE_FACETS)[number];
export type FacetId = RangeFacet | "heating";

const LOAD = ["kg", "heating", "power"] as const satisfies readonly FacetId[];
const IRON = ["width", "speed", "heating", "power"] as const satisfies readonly FacetId[];
const VOLUME = ["volume"] as const satisfies readonly FacetId[];
const FINISH = ["heating", "power"] as const satisfies readonly FacetId[];

export const FACETS_BY_CATEGORY: Record<CategorySlug, readonly FacetId[]> = {
  washers: LOAD,
  dryers: LOAD,
  "washer-dryers": LOAD,
  "flatwork-ironers": IRON,
  "ironing-rollers": IRON,
  "laundry-carts": VOLUME,
  "water-recovery": VOLUME,
  finishing: FINISH,
};

/** All categories: chips and search are always on; only heating is an extra facet. */
export const FACETS_WHEN_ALL: readonly FacetId[] = ["heating"];

export function facetsForCategory(
  category: CategorySlug | null,
): readonly FacetId[] {
  if (!category) return FACETS_WHEN_ALL;
  return FACETS_BY_CATEGORY[category];
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
