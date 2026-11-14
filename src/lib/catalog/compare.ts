import { silhouetteScale } from "@/lib/silhouette";

import type { CategorySlug, Product } from "./schema";
import {
  getSpecFieldValue,
  SPEC_FIELD_ORDER,
  type SpecFieldKey,
} from "./spec-groups";

const EMPTY = "—";

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
  };
  if (product.heatingVariant !== undefined) {
    record.heatingVariant = product.heatingVariant;
  }
  return record;
}

export function buildCompareRecords(
  products: readonly Product[],
): Record<string, CompareRecord> {
  const out: Record<string, CompareRecord> = {};
  for (const product of products) {
    out[product.slug] = toCompareRecord(product);
  }
  return out;
}

function asProduct(record: CompareRecord): Product {
  // CompareRecord is a structural subset; cast is safe for getSpecFieldValue.
  return record as unknown as Product;
}

/**
 * Rows = union of non-empty spec fields across products (stable SPEC_FIELD_ORDER).
 * Missing values render as "—".
 */
export function buildCompareMatrix(
  products: readonly CompareRecord[],
  heatingLabels: Partial<Record<string, string>>,
): CompareMatrix {
  const present = new Set<SpecFieldKey>();
  for (const product of products) {
    for (const key of SPEC_FIELD_ORDER) {
      const value = getSpecFieldValue(
        asProduct(product),
        key,
        heatingLabels,
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
        const value = getSpecFieldValue(
          asProduct(product),
          key,
          heatingLabels,
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
    const { w, h } = product.dimensionsMm;
    maxMm = Math.max(maxMm, w, h);
  }
  return silhouetteScale({ w: maxMm, h: maxMm }, targetMaxPx);
}

export function serializeCompareSlugs(slugs: readonly string[]): string {
  return slugs.slice(0, 4).join(",");
}
