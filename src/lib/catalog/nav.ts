import { getIndex } from "@/lib/catalog";
import { CATEGORY_SLUGS, type CategorySlug } from "@/lib/catalog/schema";

export type CategoryNavStat = {
  slug: CategorySlug;
  count: number;
  /** Present only for washers and dryers, and only when the index has kg. */
  loadMin: number | null;
  loadMax: number | null;
};

const LOAD_RANGE_SLUGS: ReadonlySet<CategorySlug> = new Set([
  "washers",
  "dryers",
]);

export function getCategoryNavStats(): CategoryNavStat[] {
  const items = getIndex();
  return CATEGORY_SLUGS.map((slug) => {
    const group = items.filter((item) => item.category === slug);
    let loadMin: number | null = null;
    let loadMax: number | null = null;

    if (LOAD_RANGE_SLUGS.has(slug)) {
      for (const item of group) {
        if (!item.loadKg) continue;
        loadMin =
          loadMin === null ? item.loadKg.min : Math.min(loadMin, item.loadKg.min);
        loadMax =
          loadMax === null ? item.loadKg.max : Math.max(loadMax, item.loadKg.max);
      }
    }

    return { slug, count: group.length, loadMin, loadMax };
  });
}

/** `8–120 кг` with a no-break space before the unit. */
export function formatNavLoad(
  min: number,
  max: number,
  locale: string,
  unit: string,
): string {
  const fmt = new Intl.NumberFormat(locale);
  const range =
    min === max ? fmt.format(min) : `${fmt.format(min)}–${fmt.format(max)}`;
  return `${range}\u00A0${unit}`;
}
