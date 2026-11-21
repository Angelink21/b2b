import {
  CATEGORY_DEFS,
  getCategoryDef,
  type CategoryColumnDef,
  type CategoryColumnId,
  type CategorySlug,
} from "@/config/categories";

export type CatalogColumnId = CategoryColumnId;
export type CatalogColumnDef = CategoryColumnDef;

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

export function getCatalogColumns(
  category: CategorySlug | null | undefined,
): readonly CatalogColumnDef[] {
  if (!category) return DEFAULT_COLUMNS;
  return getCategoryDef(category)?.columns ?? DEFAULT_COLUMNS;
}

export function getCatalogColumnIds(
  category: CategorySlug | null | undefined,
): CatalogColumnId[] {
  return getCatalogColumns(category).map((c) => c.id);
}

export function assertNoNarrowHideOnRequired(
  columns: readonly CatalogColumnDef[],
): true {
  for (const col of columns) {
    if (col.narrowHide && REQUIRED_IDS.has(col.id)) {
      throw new Error(`narrowHide forbidden on required column ${col.id}`);
    }
  }
  return true;
}

/** @deprecated Prefer assertNoNarrowHideOnRequired */
export const assertNoRequiredNarrowHide = assertNoNarrowHideOnRequired;

export const BY_CATEGORY = Object.fromEntries(
  CATEGORY_DEFS.map((d) => [d.slug, d.columns]),
) as unknown as Readonly<Record<CategorySlug, readonly CatalogColumnDef[]>>;
