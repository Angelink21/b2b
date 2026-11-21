import {
  CATEGORY_DEFS,
  type CategorySlug,
} from "@/config/categories";

/** Physical size (Ш×Г×В) filters — only categories that opt in via the registry. */
export const DIMENSION_FILTER_CATEGORIES = CATEGORY_DEFS.filter(
  (d) => d.dimensionFilter,
).map((d) => d.slug) as readonly CategorySlug[];

export function dimensionFilterAllowed(category: CategorySlug | null): boolean {
  if (!category) return false;
  return DIMENSION_FILTER_CATEGORIES.includes(category);
}
