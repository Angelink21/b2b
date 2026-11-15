"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, type ReactNode } from "react";

import { CompareCheckbox } from "@/components/compare/CompareCheckbox";
import { ModelSharedTransition } from "@/components/motion/ModelSharedTransition";
import {
  DataTable,
  type DataTableColumn,
  type DataTableSortState,
} from "@/components/ui/DataTable";
import {
  getCatalogColumns,
  type CatalogColumnId,
} from "@/config/columns";
import { Link } from "@/i18n/navigation";
import {
  formatIndexDimensions,
  formatIndexKeyMetric,
  formatIndexLoadKg,
  formatIndexPower,
  formatIndexSpeed,
  formatOrDashNumber,
  indexKeyMetricSortValue,
} from "@/lib/catalog/format";
import { defaultCatalogSort } from "@/lib/catalog/query";
import type { CatalogIndexItem, CategorySlug } from "@/lib/catalog/schema";
import {
  COLUMN_TO_SORT_BY,
  SORT_BY_TO_COLUMN,
  type SortParam,
} from "@/lib/catalog/search-params";

import { saveCatalogReturn } from "./catalog-session";

type CatalogTableProps = {
  rows: CatalogIndexItem[];
  category: CategorySlug | null;
  sort: SortParam | null;
  onSortChange: (next: SortParam | null) => void;
  returnPathname: string;
  returnSearch: string;
  empty: ReactNode;
};

function sortStateFromParam(
  sort: SortParam | null,
  category: CategorySlug | null,
): DataTableSortState {
  const effective = sort ?? defaultCatalogSort(category);
  return { id: SORT_BY_TO_COLUMN[effective.by], dir: effective.dir };
}

function cellText(
  id: CatalogColumnId,
  row: CatalogIndexItem,
  locale: string,
  tCat: (key: string) => string,
  tHeat: (key: string) => string,
  units: { kg: string; mm: string; L: string; kW: string },
): string {
  switch (id) {
    case "name":
      return row.name;
    case "type":
      return tCat(row.category);
    case "loadKg":
      return formatIndexLoadKg(row.loadKg, locale);
    case "power":
      return formatIndexPower(row.powerKwMax, locale);
    case "heating":
      return row.heating ? tHeat(row.heating) : "—";
    case "dimensions":
      return formatIndexDimensions(row.dimensionsMm, locale);
    case "gFactor":
      return formatOrDashNumber(locale, row.gFactor, 0);
    case "spinRpm":
      return formatOrDashNumber(locale, row.spinRpm, 0);
    case "workingWidthMm":
      return formatOrDashNumber(locale, row.workingWidthMm, 0);
    case "workingSpeedMpm":
      return formatIndexSpeed(row.workingSpeedMpm, locale);
    case "shaftDiameterMm":
      return formatOrDashNumber(locale, row.shaftDiameterMm, 0);
    case "volumeL":
      return formatOrDashNumber(locale, row.volumeL, 0);
    case "keyMetric":
      return formatIndexKeyMetric(row, units, locale);
    default:
      return "—";
  }
}

function sortValue(
  id: CatalogColumnId,
  row: CatalogIndexItem,
): string | number | null {
  switch (id) {
    case "name":
      return row.name;
    case "loadKg":
      return row.loadKg?.max ?? null;
    case "power":
      return row.powerKwMax;
    case "gFactor":
      return row.gFactor;
    case "spinRpm":
      return row.spinRpm;
    case "workingWidthMm":
      return row.workingWidthMm;
    case "workingSpeedMpm":
      return row.workingSpeedMpm?.max ?? null;
    case "shaftDiameterMm":
      return row.shaftDiameterMm;
    case "volumeL":
      return row.volumeL;
    case "keyMetric":
      return indexKeyMetricSortValue(row);
    default:
      return null;
  }
}

export function CatalogTable({
  rows,
  category,
  sort,
  onSortChange,
  returnPathname,
  returnSearch,
  empty,
}: CatalogTableProps) {
  const t = useTranslations("catalog");
  const tCompare = useTranslations("compare");
  const locale = useLocale();
  const tCat = useTranslations("categories");
  const tHeat = useTranslations("heating");
  const tUnits = useTranslations("units");

  const columnDefs = getCatalogColumns(category);
  const units = useMemo(
    () => ({
      kg: tUnits("kg"),
      mm: tUnits("mm"),
      L: tUnits("L"),
      kW: tUnits("kW"),
    }),
    [tUnits],
  );

  const columns: DataTableColumn<CatalogIndexItem>[] = useMemo(() => {
    const headerFor = (id: CatalogColumnId): string => {
      switch (id) {
        case "name":
          return t("name");
        case "type":
          return t("type");
        case "loadKg":
          return t("load");
        case "power":
          return t("power");
        case "heating":
          return t("heating");
        case "dimensions":
          return t("dimensions");
        case "gFactor":
          return t("colGFactor");
        case "spinRpm":
          return t("colSpin");
        case "workingWidthMm":
          return t("colWidth");
        case "workingSpeedMpm":
          return t("colSpeed");
        case "shaftDiameterMm":
          return t("colShaft");
        case "volumeL":
          return t("colVolume");
        case "keyMetric":
          return t("colKeyMetric");
        default:
          return id;
      }
    };

    return columnDefs.map((def) => {
      const id = def.id;
      const numeric =
        id === "loadKg" ||
        id === "power" ||
        id === "gFactor" ||
        id === "spinRpm" ||
        id === "workingWidthMm" ||
        id === "workingSpeedMpm" ||
        id === "shaftDiameterMm" ||
        id === "volumeL" ||
        id === "keyMetric" ||
        id === "dimensions";

      const column: DataTableColumn<CatalogIndexItem> = {
        id,
        header: headerFor(id),
        sortable: Boolean(def.sortable),
        numeric,
        sortValue: (row: CatalogIndexItem) => sortValue(id, row),
        cell: (row: CatalogIndexItem) => {
          if (id === "name") {
            return (
              <div className="catalog-name-cell">
                <CompareCheckbox slug={row.slug} name={row.name} />
                <ModelSharedTransition slug={row.slug}>
                  <Link
                    href={`/catalog/${row.category}/${row.slug}`}
                    className="catalog-model-link"
                    translate="no"
                    onClick={() => {
                      saveCatalogReturn({
                        pathname: returnPathname,
                        search: returnSearch,
                        scrollY: window.scrollY,
                      });
                    }}
                  >
                    {row.name}
                  </Link>
                </ModelSharedTransition>
              </div>
            );
          }
          return cellText(id, row, locale, tCat, tHeat, units);
        },
      };
      if (def.narrowHide !== undefined) {
        column.narrowHide = def.narrowHide;
      }
      if (id === "name") {
        column.leadingHeader = (
          <span className="catalog-compare-th">
            <span className="sr-only">{tCompare("add")}</span>
          </span>
        );
      }
      return column;
    });
  }, [
    columnDefs,
    locale,
    returnPathname,
    returnSearch,
    t,
    tCat,
    tCompare,
    tHeat,
    units,
  ]);

  return (
    <DataTable
      caption={t("tableCaption")}
      columns={columns}
      rows={rows}
      rowKey={(row) => row.slug}
      empty={empty}
      rowsPreSorted
      sort={sortStateFromParam(sort, category)}
      onSortChange={(next) => {
        if (!next) {
          onSortChange(null);
          return;
        }
        const by = COLUMN_TO_SORT_BY[next.id];
        if (!by) {
          onSortChange(null);
          return;
        }
        const def = defaultCatalogSort(category);
        if (by === def.by && next.dir === def.dir) {
          onSortChange(null);
          return;
        }
        onSortChange({ by, dir: next.dir });
      }}
    />
  );
}
