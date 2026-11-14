import {
  createParser,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs";

import { CATEGORY_SLUGS, HEATING_KEYS } from "./schema";

export type KgRangeParam = { min: number; max: number };

export type SortParam = {
  by:
    | "name"
    | "kg"
    | "power"
    | "width"
    | "speed"
    | "volume"
    | "gFactor"
    | "spinRpm"
    | "shaft";
  dir: "asc" | "desc";
};

const SORT_BY = [
  "name",
  "kg",
  "power",
  "width",
  "speed",
  "volume",
  "gFactor",
  "spinRpm",
  "shaft",
] as const;

const SORT_DIR = ["asc", "desc"] as const;

/** Map table column id → sort.by used in URL. */
export const COLUMN_TO_SORT_BY: Partial<
  Record<string, SortParam["by"]>
> = {
  name: "name",
  loadKg: "kg",
  power: "power",
  workingWidthMm: "width",
  workingSpeedMpm: "speed",
  volumeL: "volume",
  gFactor: "gFactor",
  spinRpm: "spinRpm",
  shaftDiameterMm: "shaft",
};

export const SORT_BY_TO_COLUMN: Record<SortParam["by"], string> = {
  name: "name",
  kg: "loadKg",
  power: "power",
  width: "workingWidthMm",
  speed: "workingSpeedMpm",
  volume: "volumeL",
  gFactor: "gFactor",
  spinRpm: "spinRpm",
  shaft: "shaftDiameterMm",
};

export const parseAsKgRange = createParser({
  parse(queryValue: string): KgRangeParam | null {
    const match = /^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/.exec(queryValue.trim());
    if (!match) return null;
    const min = Number(match[1]);
    const max = Number(match[2]);
    if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) return null;
    return { min, max };
  },
  serialize(value: KgRangeParam): string {
    return `${value.min}-${value.max}`;
  },
});

export const parseAsCatalogSort = createParser({
  parse(queryValue: string): SortParam | null {
    const [byRaw, dirRaw] = queryValue.split(":");
    if (!byRaw || !dirRaw) return null;
    if (!(SORT_BY as readonly string[]).includes(byRaw)) return null;
    if (!(SORT_DIR as readonly string[]).includes(dirRaw)) return null;
    return {
      by: byRaw as SortParam["by"],
      dir: dirRaw as SortParam["dir"],
    };
  },
  serialize(value: SortParam): string {
    return `${value.by}:${value.dir}`;
  },
});

export const CATALOG_PAGE_SIZE = 60;

export const catalogParsers = {
  kg: parseAsKgRange,
  type: parseAsStringLiteral(CATEGORY_SLUGS),
  heat: parseAsStringLiteral(HEATING_KEYS),
  q: parseAsString.withDefault(""),
  sort: parseAsCatalogSort,
  limit: parseAsInteger.withDefault(CATALOG_PAGE_SIZE),
};

export type CatalogQueryState = {
  kg: KgRangeParam | null;
  type: (typeof CATEGORY_SLUGS)[number] | null;
  heat: (typeof HEATING_KEYS)[number] | null;
  q: string;
  sort: SortParam | null;
  limit: number;
};
