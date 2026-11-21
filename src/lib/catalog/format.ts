import type { Product } from "./schema";

const EMPTY = "—";

type LoadKg = NonNullable<Product["loadKg"]>;
type PowerKw = NonNullable<Product["powerKw"]>;
type VolumeL = NonNullable<Product["volumeL"]>;
type RangeNumber = NonNullable<Product["workingSpeedMpm"]>;
type DimensionsMm = Product["dimensionsMm"];
type NoiseDb = NonNullable<Product["noiseDb"]>;
type Airflow = NonNullable<Product["airflowM3h"]>;

/** Shared Intl formatter for catalog UI numbers (uk/en). */
export function formatCatalogNumber(
  locale: string,
  value: number,
  fractionDigits?: number,
): string {
  if (fractionDigits !== undefined) {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(value);
  }
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}

/** Load kg in table / panel / lead: integers plain, decimals with one digit. */
export function formatLoadNumber(locale: string, value: number): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: Number.isInteger(value) ? 0 : 1,
  }).format(value);
}

export function formatLoadRange(
  locale: string,
  min: number,
  max: number,
): string {
  if (min === max) return formatLoadNumber(locale, max);
  return `${formatLoadNumber(locale, min)}–${formatLoadNumber(locale, max)}`;
}

export function formatCatalogRange(
  locale: string,
  min: number,
  max: number,
  fractionDigits?: number,
): string {
  if (min === max) return formatCatalogNumber(locale, max, fractionDigits);
  return `${formatCatalogNumber(locale, min, fractionDigits)}–${formatCatalogNumber(locale, max, fractionDigits)}`;
}

function digitsForStep(step: number): number {
  if (Number.isInteger(step)) return 0;
  const text = String(step);
  const i = text.indexOf(".");
  return i === -1 ? 0 : text.length - i - 1;
}

/** Format a bound for filter readouts; step caps fraction digits (no trailing zeros). */
export function formatCatalogBound(
  locale: string,
  value: number,
  step: number,
): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: digitsForStep(step),
  }).format(value);
}

export function formatOrDash(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return EMPTY;
  return String(value);
}

export function formatOrDashNumber(
  locale: string,
  value: number | null | undefined,
  fractionDigits = 0,
): string {
  if (value === null || value === undefined) return EMPTY;
  return formatCatalogNumber(locale, value, fractionDigits);
}

export function formatLoadKg(load: LoadKg | null | undefined): string {
  if (!load) return EMPTY;
  return load.raw;
}

export function formatPowerKw(power: PowerKw | null | undefined): string {
  if (!power) return EMPTY;
  return power.raw;
}

export function formatVolumeL(volume: VolumeL | null | undefined): string {
  if (!volume) return EMPTY;
  return volume.raw;
}

export function formatRangeNumber(
  range: RangeNumber | null | undefined,
): string {
  if (!range) return EMPTY;
  return range.raw;
}

export function formatDimensionsMm(
  dims: DimensionsMm | null | undefined,
): string {
  if (!dims) return EMPTY;
  if (!(dims.w > 0 && dims.d > 0 && dims.h > 0)) return EMPTY;
  const base = `${dims.w}×${dims.d}×${dims.h}`;
  return dims.note ? `${base} (${dims.note})` : base;
}

export function formatNoiseDb(noise: NoiseDb | null | undefined): string {
  if (!noise) return EMPTY;
  if (noise.lessThan) return `<${noise.value}`;
  if (noise.alt !== undefined) return `${noise.value}/${noise.alt}`;
  return String(noise.value);
}

export function formatAirflow(airflow: Airflow | null | undefined): string {
  if (!airflow) return EMPTY;
  return airflow.raw;
}

export function formatVoltage(
  voltage: string[] | null | undefined,
  voltageRaw: string | null | undefined,
): string {
  if (voltageRaw) return voltageRaw;
  if (!voltage || voltage.length === 0) return EMPTY;
  return voltage.join(", ");
}

export function formatIndexLoadKg(
  load: { min: number; max: number } | null | undefined,
  locale = "uk",
): string {
  if (!load) return EMPTY;
  return formatLoadRange(locale, load.min, load.max);
}

export function formatIndexPower(
  powerMax: number | null | undefined,
  locale = "uk",
): string {
  if (powerMax === null || powerMax === undefined) return EMPTY;
  return formatCatalogNumber(locale, powerMax);
}

export function formatIndexSpeed(
  speed: { min: number; max: number } | null | undefined,
  locale = "uk",
): string {
  if (!speed) return EMPTY;
  return formatCatalogRange(locale, speed.min, speed.max);
}

export function formatIndexDimensions(
  dims: { w: number; d: number; h: number },
  locale = "uk",
): string {
  const fmt = new Intl.NumberFormat(locale, {
    useGrouping: false,
    maximumFractionDigits: 0,
  });
  return `${fmt.format(dims.w)}\u00A0×\u00A0${fmt.format(dims.d)}\u00A0×\u00A0${fmt.format(dims.h)}`;
}

type IndexKeyUnits = { kg: string; mm: string; L: string; kW: string };

/** Per-row key metric for the all-categories catalog table. */
export function formatIndexKeyMetric(
  row: {
    category: string;
    loadKg?: { min: number; max: number } | null;
    workingWidthMm?: number | null;
    volumeL?: number | null;
    powerKwMax?: number | null;
  },
  units: IndexKeyUnits,
  locale = "uk",
): string {
  switch (row.category) {
    case "washers":
    case "dryers":
    case "washer-dryers": {
      const load = formatIndexLoadKg(row.loadKg, locale);
      return load === EMPTY ? EMPTY : `${load}\u00A0${units.kg}`;
    }
    case "flatwork-ironers":
    case "ironing-rollers": {
      if (row.workingWidthMm == null) return EMPTY;
      return `${formatCatalogNumber(locale, row.workingWidthMm, 0)}\u00A0${units.mm}`;
    }
    case "laundry-carts":
    case "water-recovery": {
      if (row.volumeL == null) return EMPTY;
      return `${formatCatalogNumber(locale, row.volumeL, 0)}\u00A0${units.L}`;
    }
    case "finishing": {
      if (row.powerKwMax == null) return EMPTY;
      return `${formatIndexPower(row.powerKwMax, locale)}\u00A0${units.kW}`;
    }
    default:
      return EMPTY;
  }
}

export function indexKeyMetricSortValue(row: {
  category: string;
  loadKg?: { min: number; max: number } | null;
  workingWidthMm?: number | null;
  volumeL?: number | null;
  powerKwMax?: number | null;
}): number | null {
  switch (row.category) {
    case "washers":
    case "dryers":
    case "washer-dryers":
      return row.loadKg?.max ?? null;
    case "flatwork-ironers":
    case "ironing-rollers":
      return row.workingWidthMm ?? null;
    case "laundry-carts":
    case "water-recovery":
      return row.volumeL ?? null;
    case "finishing":
      return row.powerKwMax ?? null;
    default:
      return null;
  }
}
