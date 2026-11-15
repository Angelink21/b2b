"use client";

import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useMemo, useState, type ReactNode } from "react";

import { isExpressive, MOTION_EASE, MOTION_MS } from "@/config/motion";

export type DataTableColumn<T> = {
  id: string;
  header: ReactNode;
  /** Visually hide header text; keep it for assistive tech. */
  headerVisuallyHidden?: boolean;
  /** Content before the header label (e.g. compare gutter). */
  leadingHeader?: ReactNode;
  sortable?: boolean;
  /** Marks numeric / dimensional cells for tabular figures */
  numeric?: boolean;
  /** Progressive hide stage for container queries (1 first, 2 last). */
  narrowHide?: 1 | 2;
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

const LAYOUT_ROW_CAP = 30;

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
  const reduced = useReducedMotion() === true;
  const layoutRows = isExpressive() && !reduced;

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
      return (
        String(av).localeCompare(String(bv), "uk", {
          numeric: true,
          sensitivity: "base",
        }) * dir
      );
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
      <LayoutGroup>
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
                const headerNode = col.headerVisuallyHidden ? (
                  <span className="sr-only">{col.header}</span>
                ) : (
                  col.header
                );
                const label = col.sortable ? (
                  <button
                    type="button"
                    className="data-table-sort"
                    onClick={() => toggleSort(col.id)}
                  >
                    <span className="data-table-sort-label">{headerNode}</span>
                    <span className="data-table-sort-mark" aria-hidden="true">
                      {sort?.id === col.id
                        ? sort.dir === "asc"
                          ? "↑"
                          : "↓"
                        : "↕"}
                    </span>
                  </button>
                ) : (
                  <span className="data-table-th-label">{headerNode}</span>
                );
                return (
                  <th
                    key={col.id}
                    scope="col"
                    aria-sort={ariaSort}
                    aria-label={
                      col.headerVisuallyHidden && typeof col.header === "string"
                        ? col.header
                        : undefined
                    }
                    data-col={col.id}
                    data-narrow-hide={
                      col.narrowHide !== undefined
                        ? String(col.narrowHide)
                        : undefined
                    }
                    className={col.numeric ? "is-num" : undefined}
                  >
                    <div className="data-table-th-inner">
                      {col.leadingHeader ? (
                        <span className="data-table-th-leading">
                          {col.leadingHeader}
                        </span>
                      ) : null}
                      {label}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, index) => {
              const key = rowKey(row);
              const cells = columns.map((col) => (
                <td
                  key={col.id}
                  data-col={col.id}
                  data-narrow-hide={
                    col.narrowHide !== undefined
                      ? String(col.narrowHide)
                      : undefined
                  }
                  className={col.numeric ? "is-num" : undefined}
                >
                  {col.cell(row)}
                </td>
              ));
              // motion: first 30 filtered rows reflow with layout animation
              if (layoutRows && index < LAYOUT_ROW_CAP) {
                return (
                  <motion.tr
                    key={key}
                    layout
                    transition={{
                      duration: MOTION_MS.base / 1000,
                      ease: MOTION_EASE.standard,
                    }}
                  >
                    {cells}
                  </motion.tr>
                );
              }
              return <tr key={key}>{cells}</tr>;
            })}
          </tbody>
        </table>
      </LayoutGroup>
    </div>
  );
}
