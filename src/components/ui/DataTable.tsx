"use client";

import { useMemo, useState, type ReactNode } from "react";

export type DataTableColumn<T> = {
  id: string;
  header: string;
  sortable?: boolean;
  /** Numeric sort helper; falls back to string of cell */
  sortValue?: (row: T) => string | number | null;
  cell: (row: T) => ReactNode;
};

export type DataTableSortState = { id: string; dir: "asc" | "desc" } | null;

type DataTableProps<T> = {
  caption: string;
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty: ReactNode;
  className?: string;
  /** Controlled sort; when set, parent owns sorting of `rows`. */
  sort?: DataTableSortState;
  onSortChange?: (next: DataTableSortState) => void;
  /** When true with controlled sort, skip internal re-sort (rows already sorted). */
  rowsPreSorted?: boolean;
};

function nextSortState(
  prev: DataTableSortState,
  id: string,
): DataTableSortState {
  if (!prev || prev.id !== id) return { id, dir: "asc" };
  if (prev.dir === "asc") return { id, dir: "desc" };
  return null;
}

export function DataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  empty,
  className = "",
  sort: controlledSort,
  onSortChange,
  rowsPreSorted = false,
}: DataTableProps<T>) {
  const [uncontrolledSort, setUncontrolledSort] =
    useState<DataTableSortState>(null);
  const controlled = onSortChange !== undefined;
  const sort = controlled ? (controlledSort ?? null) : uncontrolledSort;

  const sorted = useMemo(() => {
    if (controlled && rowsPreSorted) return rows;
    if (!sort) return rows;
    const col = columns.find((c) => c.id === sort.id);
    if (!col) return rows;
    const copy = [...rows];
    const dir = sort.dir === "asc" ? 1 : -1;
    copy.sort((a, b) => {
      const av = col.sortValue?.(a) ?? String(col.cell(a) ?? "");
      const bv = col.sortValue?.(b) ?? String(col.cell(b) ?? "");
      if (av === null || av === "") return 1;
      if (bv === null || bv === "") return -1;
      if (typeof av === "number" && typeof bv === "number") {
        return (av - bv) * dir;
      }
      return String(av).localeCompare(String(bv), undefined, { numeric: true }) *
        dir;
    });
    return copy;
  }, [columns, controlled, rows, rowsPreSorted, sort]);

  function toggleSort(id: string) {
    const next = nextSortState(sort, id);
    if (controlled) {
      onSortChange?.(next);
    } else {
      setUncontrolledSort(next);
    }
  }

  if (rows.length === 0) {
    return <div className={`data-table-empty ${className}`.trim()}>{empty}</div>;
  }

  return (
    <div className={`data-table-wrap ${className}`.trim()}>
      <table className="data-table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((col) => {
              const ariaSort =
                sort?.id === col.id
                  ? sort.dir === "asc"
                    ? "ascending"
                    : "descending"
                  : col.sortable
                    ? "none"
                    : undefined;
              return (
                <th key={col.id} scope="col" aria-sort={ariaSort}>
                  {col.sortable ? (
                    <button
                      type="button"
                      className="data-table-sort"
                      onClick={() => toggleSort(col.id)}
                    >
                      {col.header}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((col) => (
                <td key={col.id}>{col.cell(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
