import type { CategorySlug } from "@/lib/catalog/schema";

/** Column ids used in the catalog table and URL sort. */
export type CatalogColumnId =
  | "name"
  | "type"
  | "loadKg"
  | "power"
  | "heating"
  | "dimensions"
  | "gFactor"
  | "spinRpm"
  | "workingWidthMm"
  | "workingSpeedMpm"
  | "shaftDiameterMm"
  | "volumeL"
  | "keyMetric";

export type CatalogColumnDef = {
  id: CatalogColumnId;
  sortable?: boolean;
  /**
   * Progressive hide via container query (never on required cols).
   * 1 = hide first (spin / G / speed / shaft); 2 = hide last (power).
   */
  narrowHide?: 1 | 2;
};

/** Required columns that must never use narrowHide. */
const REQUIRED_IDS = new Set<CatalogColumnId>([
  "name",
  "type",
  "loadKg",
  "heating",
  "dimensions",
  "workingWidthMm",
  "volumeL",
  "keyMetric",
]);

/** All-categories view: compact columns with a per-row key metric. */
const DEFAULT_COLUMNS: readonly CatalogColumnDef[] = [
  { id: "name", sortable: true },
  { id: "type" },
  { id: "heating" },
  { id: "dimensions" },
  { id: "keyMetric", sortable: true },
] as const;

const BY_CATEGORY: Readonly<Record<CategorySlug, readonly CatalogColumnDef[]>> =
  {
    washers: [
      { id: "name", sortable: true },
      { id: "loadKg", sortable: true },
      { id: "power", sortable: true, narrowHide: 2 },
      { id: "gFactor", sortable: true, narrowHide: 1 },
      { id: "spinRpm", sortable: true, narrowHide: 1 },
      { id: "heating" },
      { id: "dimensions" },
    ],
    "washer-dryers": [
      { id: "name", sortable: true },
      { id: "loadKg", sortable: true },
      { id: "power", sortable: true, narrowHide: 2 },
      { id: "gFactor", sortable: true, narrowHide: 1 },
      { id: "spinRpm", sortable: true, narrowHide: 1 },
      { id: "heating" },
      { id: "dimensions" },
    ],
    dryers: [
      { id: "name", sortable: true },
      { id: "loadKg", sortable: true },
      { id: "power", sortable: true, narrowHide: 2 },
      { id: "heating" },
      { id: "dimensions" },
    ],
    "flatwork-ironers": [
      { id: "name", sortable: true },
      { id: "workingWidthMm", sortable: true },
      { id: "workingSpeedMpm", sortable: true, narrowHide: 1 },
      { id: "shaftDiameterMm", sortable: true, narrowHide: 1 },
      { id: "power", sortable: true, narrowHide: 2 },
      { id: "heating" },
      { id: "dimensions" },
    ],
    "ironing-rollers": [
      { id: "name", sortable: true },
      { id: "workingWidthMm", sortable: true },
      { id: "workingSpeedMpm", sortable: true, narrowHide: 1 },
      { id: "shaftDiameterMm", sortable: true, narrowHide: 1 },
      { id: "power", sortable: true, narrowHide: 2 },
      { id: "heating" },
      { id: "dimensions" },
    ],
    "laundry-carts": [
      { id: "name", sortable: true },
      { id: "volumeL", sortable: true },
      { id: "dimensions" },
    ],
    "water-recovery": [
      { id: "name", sortable: true },
      { id: "volumeL", sortable: true },
      { id: "dimensions" },
    ],
    finishing: [
      { id: "name", sortable: true },
      { id: "power", sortable: true },
      { id: "heating" },
      { id: "dimensions" },
    ],
  };

export function getCatalogColumns(
  category: CategorySlug | null | undefined,
): readonly CatalogColumnDef[] {
  if (!category) return DEFAULT_COLUMNS;
  return BY_CATEGORY[category] ?? DEFAULT_COLUMNS;
}

export function getCatalogColumnIds(
  category: CategorySlug | null | undefined,
): CatalogColumnId[] {
  return getCatalogColumns(category).map((c) => c.id);
}

/** Test helper: required columns must never be marked narrowHide. */
export function assertNoRequiredNarrowHide(
  cols: readonly CatalogColumnDef[],
): boolean {
  return cols.every(
    (c) => c.narrowHide === undefined || !REQUIRED_IDS.has(c.id),
  );
}
