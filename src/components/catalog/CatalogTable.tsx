"use client";

import { useTranslations } from "next-intl";
import { useMemo, type ReactNode } from "react";

import {
  getCatalogColumns,
  type CatalogColumnId,
} from "@/config/columns";
import { Link } from "@/i18n/navigation";
import {
  formatIndexDimensions,
  formatIndexLoadKg,
  formatIndexPower,
  formatIndexSpeed,
  formatOrDash,
} from "@/lib/catalog/format";
import type { CatalogIndexItem, CategorySlug } from "@/lib/catalog/schema";
import {
  COLUMN_TO_SORT_BY,
  SORT_BY_TO_COLUMN,
  type SortParam,
} from "@/lib/catalog/search-params";
import { CompareToggle } from "@/components/compare/CompareToggle";
import {
  DataTable,
  type DataTableColumn,
  type DataTableSortState,
} from "@/components/ui/DataTable";

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

function sortStateFromParam(sort: SortParam | null): DataTableSortState {
  if (!sort) return null;
  return { id: SORT_BY_TO_COLUMN[sort.by], dir: sort.dir };
}

function cellText(
  id: CatalogColumnId,
  row: CatalogIndexItem,
  tCat: (key: string) => string,
  tHeat: (key: string) => string,
): string {
  switch (id) {
    case "name":
      return row.name;
    case "type":
      return tCat(row.category);
    case "loadKg":
      return formatIndexLoadKg(row.loadKg);
    case "power":
      return formatIndexPower(row.powerKwMax);
    case "heating":
      return row.heating ? tHeat(row.heating) : "—";
    case "dimensions":
      return formatIndexDimensions(row.dimensionsMm);
    case "gFactor":
      return formatOrDash(row.gFactor);
    case "spinRpm":
      return formatOrDash(row.spinRpm);
    case "workingWidthMm":
      return formatOrDash(row.workingWidthMm);
    case "workingSpeedMpm":
      return formatIndexSpeed(row.workingSpeedMpm);
    case "shaftDiameterMm":
      return formatOrDash(row.shaftDiameterMm);
    case "volumeL":
      return formatOrDash(row.volumeL);
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
  const tCat = useTranslations("categories");
  const tHeat = useTranslations("heating");

  const columnDefs = getCatalogColumns(category);

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
        default:
          return id;
      }
    };

    const dataColumns: DataTableColumn<CatalogIndexItem>[] =
      columnDefs.map((def) => {
        const id = def.id;
        return {
          id,
          header: headerFor(id),
          sortable: Boolean(def.sortable),
          sortValue: (row) => sortValue(id, row),
          cell: (row) => {
            if (id === "name") {
              return (
                <Link
                  href={`/catalog/${row.category}/${row.slug}`}
                  className="catalog-model-link"
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
              );
            }
            return cellText(id, row, tCat, tHeat);
          },
        };
      });

    return [
      ...dataColumns,
      {
        id: "actions",
        header: t("actions"),
        sortable: false,
        cell: (row) => <CompareToggle slug={row.slug} />,
      },
    ];
  }, [columnDefs, returnPathname, returnSearch, t, tCat, tHeat]);

  return (
    <DataTable
      caption={t("tableCaption")}
      columns={columns}
      rows={rows}
      rowKey={(row) => row.slug}
      empty={empty}
      rowsPreSorted
      sort={sortStateFromParam(sort)}
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
        onSortChange({ by, dir: next.dir });
      }}
    />
  );
}
