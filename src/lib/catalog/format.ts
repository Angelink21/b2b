import type { Product } from "./schema";

const EMPTY = "—";

type LoadKg = NonNullable<Product["loadKg"]>;
type PowerKw = NonNullable<Product["powerKw"]>;
type VolumeL = NonNullable<Product["volumeL"]>;
type RangeNumber = NonNullable<Product["workingSpeedMpm"]>;
type DimensionsMm = Product["dimensionsMm"];
type NoiseDb = NonNullable<Product["noiseDb"]>;
type Airflow = NonNullable<Product["airflowM3h"]>;

export function formatOrDash(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return EMPTY;
  return String(value);
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
): string {
  if (!load) return EMPTY;
  if (load.min === load.max) return String(load.max);
  return `${load.min}–${load.max}`;
}

export function formatIndexPower(powerMax: number | null | undefined): string {
  if (powerMax === null || powerMax === undefined) return EMPTY;
  return String(powerMax);
}

export function formatIndexSpeed(
  speed: { min: number; max: number } | null | undefined,
): string {
  if (!speed) return EMPTY;
  if (speed.min === speed.max) return String(speed.max);
  return `${speed.min}–${speed.max}`;
}

export function formatIndexDimensions(dims: {
  w: number;
  d: number;
  h: number;
}): string {
  return `${dims.w}×${dims.d}×${dims.h}`;
}
