import type { CatalogIndexItem, CategorySlug, HeatingKey } from "./schema";

export type CatalogFilter = {
  category?: CategorySlug | CategorySlug[];
  heating?: HeatingKey | HeatingKey[];
  /** Inclusive kg range; matches products whose [min,max] overlaps. */
  kg?: { min?: number; max?: number };
  q?: string;
};

export type CatalogSort =
  | { by: "name"; dir: "asc" | "desc" }
  | { by: "kg"; dir: "asc" | "desc" }
  | { by: "power"; dir: "asc" | "desc" };

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
    if (heatings && heatings.length > 0) {
      if (item.heating === null || !heatings.includes(item.heating)) {
        return false;
      }
    }
    if (filter.kg) {
      if (!item.loadKg) return false;
      const lo = filter.kg.min ?? Number.NEGATIVE_INFINITY;
      const hi = filter.kg.max ?? Number.POSITIVE_INFINITY;
      // overlap of [item.min, item.max] with [lo, hi]
      if (item.loadKg.max < lo || item.loadKg.min > hi) return false;
    }
    if (q) {
      const hay = normalizeSearchQuery(item.name);
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function sortProducts<T extends CatalogIndexItem>(
  items: readonly T[],
  sort: CatalogSort,
): T[] {
  const dir = sort.dir === "asc" ? 1 : -1;
  const copy = [...items];

  copy.sort((a, b) => {
    switch (sort.by) {
      case "name":
        return a.name.localeCompare(b.name, "uk") * dir;
      case "kg": {
        const av = a.loadKg?.max ?? -1;
        const bv = b.loadKg?.max ?? -1;
        return (av - bv) * dir;
      }
      case "power": {
        const av = a.powerKwMax ?? -1;
        const bv = b.powerKwMax ?? -1;
        return (av - bv) * dir;
      }
      default:
        return 0;
    }
  });

  return copy;
}

export function searchProducts<T extends CatalogIndexItem>(
  items: readonly T[],
  q: string,
): T[] {
  return filterProducts(items, { q });
}
