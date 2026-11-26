import type { Product } from "./schema";
import {
  formatAirflow,
  formatDimensionsMm,
  formatLoadKg,
  formatNoiseDb,
  formatPowerKw,
  formatRangeNumber,
  formatVoltage,
  formatVolumeL,
  formatOrDash,
} from "./format";

export type SpecGroupId = "main" | "electrical" | "dimensions";

export type SpecFieldKey =
  | "loadKg"
  | "volumeL"
  | "boilerL"
  | "powerKw"
  | "boilerPowerKw"
  | "gFactor"
  | "spinRpm"
  | "shaftDiameterMm"
  | "workingWidthMm"
  | "workingSpeedMpm"
  | "heating"
  | "voltage"
  | "exhaustMm"
  | "airflowM3h"
  | "noiseDb"
  | "dimensionsMm";

export type SpecEntry = {
  key: SpecFieldKey;
  value: string;
};

export type SpecGroup = {
  id: SpecGroupId;
  items: SpecEntry[];
};

const MAIN_KEYS: SpecFieldKey[] = [
  "loadKg",
  "volumeL",
  "boilerL",
  "powerKw",
  "boilerPowerKw",
  "gFactor",
  "spinRpm",
  "shaftDiameterMm",
  "workingWidthMm",
  "workingSpeedMpm",
  "heating",
  "noiseDb",
];

const ELECTRICAL_KEYS: SpecFieldKey[] = [
  "voltage",
  "exhaustMm",
  "airflowM3h",
];

const DIMENSION_KEYS: SpecFieldKey[] = ["dimensionsMm"];

export const SPEC_FIELD_ORDER: readonly SpecFieldKey[] = [
  ...MAIN_KEYS,
  ...ELECTRICAL_KEYS,
  ...DIMENSION_KEYS,
];

function heatingLabel(
  product: Product,
  heatingLabels: Partial<Record<string, string>>,
): string | null {
  if (!product.heating) return null;
  const base = heatingLabels[product.heating] ?? product.heating;
  return product.heatingVariant
    ? `${base} (${product.heatingVariant})`
    : base;
}

/** Formatted value for one spec field, or null when empty. */
export function getSpecFieldValue(
  product: Product,
  key: SpecFieldKey,
  heatingLabels: Partial<Record<string, string>>,
  locale = "uk",
): string | null {
  switch (key) {
    case "loadKg":
      return product.loadKg ? formatLoadKg(product.loadKg, locale) : null;
    case "volumeL":
      return product.volumeL ? formatVolumeL(product.volumeL) : null;
    case "boilerL":
      return product.boilerL != null ? String(product.boilerL) : null;
    case "powerKw":
      return product.powerKw ? formatPowerKw(product.powerKw) : null;
    case "boilerPowerKw":
      return product.boilerPowerKw
        ? formatRangeNumber(product.boilerPowerKw)
        : null;
    case "gFactor":
      return product.gFactor != null ? String(product.gFactor) : null;
    case "spinRpm":
      return product.spinRpm != null ? String(product.spinRpm) : null;
    case "shaftDiameterMm":
      return product.shaftDiameterMm != null
        ? String(product.shaftDiameterMm)
        : null;
    case "workingWidthMm":
      return product.workingWidthMm != null
        ? String(product.workingWidthMm)
        : null;
    case "workingSpeedMpm":
      return product.workingSpeedMpm
        ? formatRangeNumber(product.workingSpeedMpm)
        : null;
    case "heating":
      return heatingLabel(product, heatingLabels);
    case "voltage":
      return product.voltage || product.voltageRaw
        ? formatVoltage(product.voltage, product.voltageRaw)
        : null;
    case "exhaustMm":
      return product.exhaustMm != null ? String(product.exhaustMm) : null;
    case "airflowM3h":
      return product.airflowM3h ? formatAirflow(product.airflowM3h) : null;
    case "noiseDb":
      return product.noiseDb ? formatNoiseDb(product.noiseDb) : null;
    case "dimensionsMm":
      return formatDimensionsMm(product.dimensionsMm, locale);
    default:
      return null;
  }
}

function collect(
  product: Product,
  keys: SpecFieldKey[],
  heatingLabels: Partial<Record<string, string>>,
  locale: string,
): SpecEntry[] {
  const items: SpecEntry[] = [];
  for (const key of keys) {
    const value = getSpecFieldValue(product, key, heatingLabels, locale);
    if (value == null || value === "" || value === "—") continue;
    items.push({ key, value });
  }
  return items;
}

/** Spec groups with only non-empty fields. */
export function buildSpecGroups(
  product: Product,
  heatingLabels: Partial<Record<string, string>>,
  locale = "uk",
): SpecGroup[] {
  const groups: SpecGroup[] = [
    { id: "main", items: collect(product, MAIN_KEYS, heatingLabels, locale) },
    {
      id: "electrical",
      items: collect(product, ELECTRICAL_KEYS, heatingLabels, locale),
    },
    {
      id: "dimensions",
      items: collect(product, DIMENSION_KEYS, heatingLabels, locale),
    },
  ];
  return groups.filter((g) => g.items.length > 0);
}

export function formatSpecFallback(value: string | null | undefined): string {
  return formatOrDash(value);
}
