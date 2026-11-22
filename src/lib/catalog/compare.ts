import {
  GENERIC_SILHOUETTE_MM,
  hasRealDimensions,
} from "@/config/categories";
import { silhouetteScale } from "@/lib/silhouette";

import {
  formatCatalogNumber,
  formatCatalogRange,
  formatDimensionsMm,
  formatLoadRange,
  formatNoiseDb,
  formatVoltage,
} from "./format";
import type { CategorySlug, Product } from "./schema";
import { SPEC_FIELD_ORDER, type SpecFieldKey } from "./spec-groups";

const EMPTY = "—";

function heatingLabelForCompare(
  product: CompareRecord,
  heatingLabels: Partial<Record<string, string>>,
): string | null {
  if (!product.heating) return null;
  const base = heatingLabels[product.heating] ?? product.heating;
  return product.heatingVariant
    ? `${base} (${product.heatingVariant})`
    : base;
}

/** Locale-aware cell text for the compare table (en-dash ranges, uk decimal comma). */
export function formatCompareFieldValue(
  product: CompareRecord,
  key: SpecFieldKey,
  heatingLabels: Partial<Record<string, string>>,
  locale: string,
): string | null {
  switch (key) {
    case "loadKg":
      return product.loadKg
        ? formatLoadRange(locale, product.loadKg.min, product.loadKg.max)
        : null;
    case "volumeL":
      return product.volumeL
        ? formatCatalogNumber(locale, product.volumeL.value)
        : null;
    case "boilerL":
      return product.boilerL != null
        ? formatCatalogNumber(locale, product.boilerL)
        : null;
    case "powerKw":
      return product.powerKw
        ? product.powerKw.alt !== undefined
          ? `${formatCatalogNumber(locale, product.powerKw.max)}/${formatCatalogNumber(locale, product.powerKw.alt)}`
          : formatCatalogNumber(locale, product.powerKw.max)
        : null;
    case "boilerPowerKw":
      return product.boilerPowerKw
        ? formatCatalogRange(
            locale,
            product.boilerPowerKw.min,
            product.boilerPowerKw.max,
          )
        : null;
    case "gFactor":
      return product.gFactor != null
        ? formatCatalogNumber(locale, product.gFactor)
        : null;
    case "spinRpm":
      return product.spinRpm != null
        ? formatCatalogNumber(locale, product.spinRpm)
        : null;
    case "shaftDiameterMm":
      return product.shaftDiameterMm != null
        ? formatCatalogNumber(locale, product.shaftDiameterMm)
        : null;
    case "workingWidthMm":
      return product.workingWidthMm != null
        ? formatCatalogNumber(locale, product.workingWidthMm)
        : null;
    case "workingSpeedMpm":
      return product.workingSpeedMpm
        ? formatCatalogRange(
            locale,
            product.workingSpeedMpm.min,
            product.workingSpeedMpm.max,
          )
        : null;
    case "heating":
      return heatingLabelForCompare(product, heatingLabels);
    case "voltage":
      return product.voltage || product.voltageRaw
        ? formatVoltage(product.voltage, product.voltageRaw)
        : null;
    case "exhaustMm":
      return product.exhaustMm != null
        ? formatCatalogNumber(locale, product.exhaustMm)
        : null;
    case "airflowM3h":
      return product.airflowM3h
        ? formatCatalogNumber(locale, product.airflowM3h.value)
        : null;
    case "noiseDb":
      return product.noiseDb ? formatNoiseDb(product.noiseDb) : null;
    case "dimensionsMm":
      return formatDimensionsMm(product.dimensionsMm);
    default:
      return null;
  }
}

/** Compact product projection for the /compare client island. */
export type CompareRecord = {
  slug: string;
  name: string;
  category: CategorySlug;
  loadKg: Product["loadKg"];
  volumeL: Product["volumeL"];
  boilerL: Product["boilerL"];
  powerKw: Product["powerKw"];
  boilerPowerKw: Product["boilerPowerKw"];
  gFactor: Product["gFactor"];
  spinRpm: Product["spinRpm"];
  shaftDiameterMm: Product["shaftDiameterMm"];
  workingWidthMm: Product["workingWidthMm"];
  workingSpeedMpm: Product["workingSpeedMpm"];
  dimensionsMm: Product["dimensionsMm"];
  heating: Product["heating"];
  heatingVariant?: string;
  voltage: Product["voltage"];
  voltageRaw: Product["voltageRaw"];
  exhaustMm: Product["exhaustMm"];
  airflowM3h: Product["airflowM3h"];
  noiseDb: Product["noiseDb"];
  imageKey: Product["imageKey"];
  image: Product["image"];
  /** Pre-resolved on the server so the compare client island never imports the images manifest. */
  photo: {
    loaderSrc: string;
    alt: string;
    width: number;
    height: number;
  } | null;
};

export type CompareMatrixRow = {
  key: SpecFieldKey;
  values: string[];
};

export type CompareMatrix = {
  slugs: string[];
  names: string[];
  rows: CompareMatrixRow[];
};

export function toCompareRecord(product: Product): CompareRecord {
  const record: CompareRecord = {
    slug: product.slug,
    name: product.name,
    category: product.category,
    loadKg: product.loadKg,
    volumeL: product.volumeL,
    boilerL: product.boilerL,
    powerKw: product.powerKw,
    boilerPowerKw: product.boilerPowerKw,
    gFactor: product.gFactor,
    spinRpm: product.spinRpm,
    shaftDiameterMm: product.shaftDiameterMm,
    workingWidthMm: product.workingWidthMm,
    workingSpeedMpm: product.workingSpeedMpm,
    dimensionsMm: product.dimensionsMm,
    heating: product.heating,
    voltage: product.voltage,
    voltageRaw: product.voltageRaw,
    exhaustMm: product.exhaustMm,
    airflowM3h: product.airflowM3h,
    noiseDb: product.noiseDb,
    imageKey: product.imageKey,
    image: product.image,
    photo: null,
  };
  if (product.heatingVariant !== undefined) {
    record.heatingVariant = product.heatingVariant;
  }
  return record;
}

export function buildCompareRecords(
  products: readonly Product[],
  photos?: ReadonlyMap<
    string,
    NonNullable<CompareRecord["photo"]> | null
  >,
): Record<string, CompareRecord> {
  const out: Record<string, CompareRecord> = {};
  for (const product of products) {
    const record = toCompareRecord(product);
    if (photos) {
      record.photo = photos.get(product.slug) ?? null;
    }
    out[product.slug] = record;
  }
  return out;
}

/**
 * Rows = union of non-empty spec fields across products (stable SPEC_FIELD_ORDER).
 * Missing values render as "—". Display uses locale (en-dash, uk comma).
 */
export function buildCompareMatrix(
  products: readonly CompareRecord[],
  heatingLabels: Partial<Record<string, string>>,
  locale = "uk",
): CompareMatrix {
  const present = new Set<SpecFieldKey>();
  for (const product of products) {
    for (const key of SPEC_FIELD_ORDER) {
      const value = formatCompareFieldValue(
        product,
        key,
        heatingLabels,
        locale,
      );
      if (value != null && value !== "" && value !== EMPTY) {
        present.add(key);
      }
    }
  }

  const rows: CompareMatrixRow[] = [];
  for (const key of SPEC_FIELD_ORDER) {
    if (!present.has(key)) continue;
    rows.push({
      key,
      values: products.map((product) => {
        const value = formatCompareFieldValue(
          product,
          key,
          heatingLabels,
          locale,
        );
        return value == null || value === "" ? EMPTY : value;
      }),
    });
  }

  return {
    slugs: products.map((p) => p.slug),
    names: products.map((p) => p.name),
    rows,
  };
}

/** Keep rows where at least two filled values differ (ignoring "—"). */
export function filterDiffRows(matrix: CompareMatrix): CompareMatrix {
  return {
    ...matrix,
    rows: matrix.rows.filter((row) => {
      const filled = row.values.filter((v) => v !== EMPTY);
      if (filled.length <= 1) return false;
      const first = filled[0];
      return filled.some((v) => v !== first);
    }),
  };
}

/** One silhouette scale so all models share the same mm→px ratio. */
export function sharedSilhouetteScale(
  products: readonly Pick<CompareRecord, "dimensionsMm">[],
  targetMaxPx: number,
): number {
  if (products.length === 0) {
    throw new Error("sharedSilhouetteScale requires at least one product");
  }
  let maxMm = 0;
  for (const product of products) {
    const dims = hasRealDimensions(product.dimensionsMm)
      ? product.dimensionsMm
      : GENERIC_SILHOUETTE_MM;
    maxMm = Math.max(maxMm, dims.w, dims.h);
  }
  return silhouetteScale({ w: maxMm, h: maxMm }, targetMaxPx);
}

export function serializeCompareSlugs(slugs: readonly string[]): string {
  return slugs.slice(0, 4).join(",");
}
