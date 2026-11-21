/**
 * Single registry for catalog categories (CSV name → slug, facets, columns, silhouette).
 * Add new categories here — see docs/ADD_CATEGORY.md.
 */

export type SilhouetteKind = "porthole" | "generic";

export type CategoryFacetId =
  | "kg"
  | "power"
  | "width"
  | "speed"
  | "volume"
  | "heating";

export type CategoryColumnId =
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

export type CategoryColumnDef = {
  id: CategoryColumnId;
  sortable?: boolean;
  narrowHide?: 1 | 2;
};

export type CategoryDef = {
  slug: string;
  /** Exact `Тип обладнання` cell from the sheet/CSV. */
  csvName: string;
  /** Display order in nav / filters (ascending). */
  menuOrder: number;
  facets: readonly CategoryFacetId[];
  columns: readonly CategoryColumnDef[];
  /** Whether Ш×Г×В max filters are allowed. */
  dimensionFilter: boolean;
  silhouette: SilhouetteKind;
};

const LOAD = ["kg", "heating", "power"] as const satisfies readonly CategoryFacetId[];
const IRON = [
  "width",
  "speed",
  "heating",
  "power",
] as const satisfies readonly CategoryFacetId[];
const VOLUME = ["volume"] as const satisfies readonly CategoryFacetId[];
const FINISH = ["heating", "power"] as const satisfies readonly CategoryFacetId[];
const MOBILE = ["heating", "power"] as const satisfies readonly CategoryFacetId[];

export const CATEGORY_DEFS = [
  {
    slug: "washers",
    csvName: "Пральні машини",
    menuOrder: 10,
    facets: LOAD,
    dimensionFilter: true,
    silhouette: "porthole",
    columns: [
      { id: "name", sortable: true },
      { id: "loadKg", sortable: true },
      { id: "power", sortable: true, narrowHide: 2 },
      { id: "gFactor", sortable: true, narrowHide: 1 },
      { id: "spinRpm", sortable: true, narrowHide: 1 },
      { id: "heating" },
      { id: "dimensions" },
    ],
  },
  {
    slug: "dryers",
    csvName: "Сушильні машини",
    menuOrder: 20,
    facets: LOAD,
    dimensionFilter: true,
    silhouette: "porthole",
    columns: [
      { id: "name", sortable: true },
      { id: "loadKg", sortable: true },
      { id: "power", sortable: true, narrowHide: 2 },
      { id: "heating" },
      { id: "dimensions" },
    ],
  },
  {
    slug: "flatwork-ironers",
    csvName: "Прасувальні каландри",
    menuOrder: 30,
    facets: IRON,
    dimensionFilter: true,
    silhouette: "generic",
    columns: [
      { id: "name", sortable: true },
      { id: "workingWidthMm", sortable: true },
      { id: "workingSpeedMpm", sortable: true, narrowHide: 1 },
      { id: "shaftDiameterMm", sortable: true, narrowHide: 1 },
      { id: "power", sortable: true, narrowHide: 2 },
      { id: "heating" },
      { id: "dimensions" },
    ],
  },
  {
    slug: "laundry-carts",
    csvName: "Візки для пральні",
    menuOrder: 40,
    facets: VOLUME,
    dimensionFilter: true,
    silhouette: "generic",
    columns: [
      { id: "name", sortable: true },
      { id: "volumeL", sortable: true },
      { id: "dimensions" },
    ],
  },
  {
    slug: "ironing-rollers",
    csvName: "Прасувальні катки",
    menuOrder: 50,
    facets: IRON,
    dimensionFilter: true,
    silhouette: "generic",
    columns: [
      { id: "name", sortable: true },
      { id: "workingWidthMm", sortable: true },
      { id: "workingSpeedMpm", sortable: true, narrowHide: 1 },
      { id: "shaftDiameterMm", sortable: true, narrowHide: 1 },
      { id: "power", sortable: true, narrowHide: 2 },
      { id: "heating" },
      { id: "dimensions" },
    ],
  },
  {
    slug: "finishing",
    csvName: "Фінішна обробка",
    menuOrder: 60,
    facets: FINISH,
    dimensionFilter: true,
    silhouette: "generic",
    columns: [
      { id: "name", sortable: true },
      { id: "power", sortable: true },
      { id: "heating" },
      { id: "dimensions" },
    ],
  },
  {
    slug: "water-recovery",
    csvName: "Система регенерації води",
    menuOrder: 70,
    facets: VOLUME,
    dimensionFilter: true,
    silhouette: "generic",
    columns: [
      { id: "name", sortable: true },
      { id: "volumeL", sortable: true },
      { id: "dimensions" },
    ],
  },
  {
    slug: "washer-dryers",
    csvName: "Прально-сушильне обладнання",
    menuOrder: 80,
    facets: LOAD,
    dimensionFilter: true,
    silhouette: "porthole",
    columns: [
      { id: "name", sortable: true },
      { id: "loadKg", sortable: true },
      { id: "power", sortable: true, narrowHide: 2 },
      { id: "gFactor", sortable: true, narrowHide: 1 },
      { id: "spinRpm", sortable: true, narrowHide: 1 },
      { id: "heating" },
      { id: "dimensions" },
    ],
  },
  {
    slug: "mobile-laundry",
    csvName: "Мобільна пральня",
    menuOrder: 90,
    facets: MOBILE,
    dimensionFilter: false,
    silhouette: "generic",
    columns: [
      { id: "name", sortable: true },
      { id: "power", sortable: true },
      { id: "heating" },
      { id: "dimensions" },
    ],
  },
] as const satisfies readonly CategoryDef[];

export type CategorySlug = (typeof CATEGORY_DEFS)[number]["slug"];

/** Menu / filter order (must stay in sync with `menuOrder` on defs). */
export const CATEGORY_SLUGS = [
  "washers",
  "dryers",
  "flatwork-ironers",
  "laundry-carts",
  "ironing-rollers",
  "finishing",
  "water-recovery",
  "washer-dryers",
  "mobile-laundry",
] as const satisfies readonly CategorySlug[];

export const CATEGORY_BY_CSV: Readonly<Record<string, CategorySlug>> =
  Object.fromEntries(CATEGORY_DEFS.map((d) => [d.csvName, d.slug])) as Record<
    string,
    CategorySlug
  >;

const BY_SLUG = new Map<string, (typeof CATEGORY_DEFS)[number]>(
  CATEGORY_DEFS.map((d) => [d.slug, d]),
);

export function getCategoryDef(
  slug: CategorySlug | string | null | undefined,
): (typeof CATEGORY_DEFS)[number] | undefined {
  if (!slug) return undefined;
  return BY_SLUG.get(slug);
}

export function isCategorySlug(value: string): value is CategorySlug {
  return BY_SLUG.has(value);
}

/** Default mm box when a model has no real dimensions (generic silhouette). */
export const GENERIC_SILHOUETTE_MM = {
  w: 2400,
  d: 6000,
  h: 2800,
} as const;

export function hasRealDimensions(dims: {
  w: number;
  d: number;
  h: number;
}): boolean {
  return dims.w > 0 && dims.d > 0 && dims.h > 0;
}
