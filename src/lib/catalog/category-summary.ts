import {
  formatCatalogRange,
  formatLoadRange,
} from "@/lib/catalog/format";
import { formatNavLoad } from "@/lib/catalog/nav";
import type { CatalogIndexItem, CategorySlug } from "@/lib/catalog/schema";

export type CategoryMetricKind = "kg" | "width" | "volume" | "power";

export type CategorySummary = {
  slug: CategorySlug;
  count: number;
  metricKind: CategoryMetricKind | null;
  metricMin: number | null;
  metricMax: number | null;
};

const METRIC_BY_CATEGORY: Readonly<
  Record<CategorySlug, CategoryMetricKind | null>
> = {
  washers: "kg",
  dryers: "kg",
  "washer-dryers": "kg",
  "flatwork-ironers": "width",
  "ironing-rollers": "width",
  "laundry-carts": "volume",
  "water-recovery": "volume",
  finishing: "power",
  "mobile-laundry": "power",
};

function readMetric(
  item: CatalogIndexItem,
  kind: CategoryMetricKind,
): { min: number; max: number } | null {
  switch (kind) {
    case "kg":
      return item.loadKg
        ? { min: item.loadKg.min, max: item.loadKg.max }
        : null;
    case "width":
      return item.workingWidthMm != null
        ? { min: item.workingWidthMm, max: item.workingWidthMm }
        : null;
    case "volume":
      return item.volumeL != null
        ? { min: item.volumeL, max: item.volumeL }
        : null;
    case "power":
      return item.powerKwMax != null
        ? { min: item.powerKwMax, max: item.powerKwMax }
        : null;
    default:
      return null;
  }
}

export function buildCategorySummary(
  slug: CategorySlug,
  items: readonly CatalogIndexItem[],
): CategorySummary {
  const kind = METRIC_BY_CATEGORY[slug];
  const group = items.filter((item) => item.category === slug);
  let metricMin: number | null = null;
  let metricMax: number | null = null;

  if (kind) {
    for (const item of group) {
      const metric = readMetric(item, kind);
      if (!metric) continue;
      metricMin =
        metricMin === null ? metric.min : Math.min(metricMin, metric.min);
      metricMax =
        metricMax === null ? metric.max : Math.max(metricMax, metric.max);
    }
  }

  return {
    slug,
    count: group.length,
    metricKind: kind,
    metricMin,
    metricMax,
  };
}

export function formatCategoryMetricRange(
  summary: CategorySummary,
  locale: string,
  units: { kg: string; mm: string; L: string; kW: string },
): string | null {
  if (
    summary.metricKind === null ||
    summary.metricMin === null ||
    summary.metricMax === null
  ) {
    return null;
  }
  const unit =
    summary.metricKind === "kg"
      ? units.kg
      : summary.metricKind === "width"
        ? units.mm
        : summary.metricKind === "volume"
          ? units.L
          : units.kW;
  return formatNavLoad(summary.metricMin, summary.metricMax, locale, unit);
}

/** Named range for category page lead, e.g. «Робоча ширина 1 400–3 300 мм». */
export function formatCategoryMetricLead(
  summary: CategorySummary,
  locale: string,
  units: { kg: string; mm: string; L: string; kW: string },
  labels: { kg: string; width: string; volume: string; power: string },
): string | null {
  if (
    summary.metricKind === null ||
    summary.metricMin === null ||
    summary.metricMax === null
  ) {
    return null;
  }
  const label =
    summary.metricKind === "kg"
      ? labels.kg
      : summary.metricKind === "width"
        ? labels.width
        : summary.metricKind === "volume"
          ? labels.volume
          : labels.power;
  const unit =
    summary.metricKind === "kg"
      ? units.kg
      : summary.metricKind === "width"
        ? units.mm
        : summary.metricKind === "volume"
          ? units.L
          : units.kW;
  const range =
    summary.metricKind === "kg"
      ? formatLoadRange(locale, summary.metricMin, summary.metricMax)
      : formatCatalogRange(locale, summary.metricMin, summary.metricMax);
  return `${label} ${range}\u00A0${unit}`;
}
