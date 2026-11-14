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
  | "volumeL";

export type CatalogColumnDef = {
  id: CatalogColumnId;
  sortable?: boolean;
};

const DEFAULT_COLUMNS: readonly CatalogColumnDef[] = [
  { id: "name", sortable: true },
  { id: "type" },
  { id: "loadKg", sortable: true },
  { id: "power", sortable: true },
  { id: "heating" },
  { id: "dimensions" },
] as const;

const BY_CATEGORY: Readonly<Record<CategorySlug, readonly CatalogColumnDef[]>> =
  {
    washers: [
      { id: "name", sortable: true },
      { id: "loadKg", sortable: true },
      { id: "power", sortable: true },
      { id: "gFactor", sortable: true },
      { id: "spinRpm", sortable: true },
      { id: "heating" },
      { id: "dimensions" },
    ],
    "washer-dryers": [
      { id: "name", sortable: true },
      { id: "loadKg", sortable: true },
      { id: "power", sortable: true },
      { id: "gFactor", sortable: true },
      { id: "spinRpm", sortable: true },
      { id: "heating" },
      { id: "dimensions" },
    ],
    dryers: [
      { id: "name", sortable: true },
      { id: "loadKg", sortable: true },
      { id: "power", sortable: true },
      { id: "heating" },
      { id: "dimensions" },
    ],
    "flatwork-ironers": [
      { id: "name", sortable: true },
      { id: "workingWidthMm", sortable: true },
      { id: "workingSpeedMpm", sortable: true },
      { id: "shaftDiameterMm", sortable: true },
      { id: "power", sortable: true },
      { id: "heating" },
      { id: "dimensions" },
    ],
    "ironing-rollers": [
      { id: "name", sortable: true },
      { id: "workingWidthMm", sortable: true },
      { id: "workingSpeedMpm", sortable: true },
      { id: "shaftDiameterMm", sortable: true },
      { id: "power", sortable: true },
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
