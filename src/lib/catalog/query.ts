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
  | { by: "power"; dir: "asc" | "desc" }
  | { by: "width"; dir: "asc" | "desc" }
  | { by: "speed"; dir: "asc" | "desc" }
  | { by: "volume"; dir: "asc" | "desc" }
  | { by: "gFactor"; dir: "asc" | "desc" }
  | { by: "spinRpm"; dir: "asc" | "desc" }
  | { by: "shaft"; dir: "asc" | "desc" };

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
    const num = (av: number, bv: number) => (av - bv) * dir;
    switch (sort.by) {
      case "name":
        return a.name.localeCompare(b.name, "uk") * dir;
      case "kg":
        return num(a.loadKg?.max ?? -1, b.loadKg?.max ?? -1);
      case "power":
        return num(a.powerKwMax ?? -1, b.powerKwMax ?? -1);
      case "width":
        return num(a.workingWidthMm ?? -1, b.workingWidthMm ?? -1);
      case "speed":
        return num(a.workingSpeedMpm?.max ?? -1, b.workingSpeedMpm?.max ?? -1);
      case "volume":
        return num(a.volumeL ?? -1, b.volumeL ?? -1);
      case "gFactor":
        return num(a.gFactor ?? -1, b.gFactor ?? -1);
      case "spinRpm":
        return num(a.spinRpm ?? -1, b.spinRpm ?? -1);
      case "shaft":
        return num(a.shaftDiameterMm ?? -1, b.shaftDiameterMm ?? -1);
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
