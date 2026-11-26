import { seriesEnMetaText } from "@/lib/catalog/series-copy";
import type { Product, Series } from "@/lib/catalog/schema";
import {
  formatAirflow,
  formatDimensionsMm,
  formatLoadKg,
  formatNoiseDb,
  formatPowerKw,
  formatRangeNumber,
  formatVoltage,
  formatVolumeL,
} from "@/lib/catalog/format";

const EMPTY = "—";

export type ProductCopyLabels = {
  /** Localized category label */
  category: string;
  /** Localized heating label, or null when unknown */
  heating: string | null;
  /** Unit labels */
  units: {
    kg: string;
    kW: string;
    mm: string;
    L: string;
    rpm: string;
    mpm: string;
    m3h: string;
    dB: string;
  };
};

/** Specs-only fragment (no model name) for uniqueness suffixes. */
export function buildProductSpecTail(
  product: Product,
  labels: ProductCopyLabels,
): string {
  const parts: string[] = [labels.category];

  const load = formatLoadKg(product.loadKg);
  if (load !== EMPTY) {
    parts.push(`${load} ${labels.units.kg}`);
  }

  if (labels.heating) {
    parts.push(labels.heating);
  }

  const power = formatPowerKw(product.powerKw);
  if (power !== EMPTY) {
    parts.push(`${power} ${labels.units.kW}`);
  }

  if (product.workingWidthMm != null) {
    parts.push(`${product.workingWidthMm} ${labels.units.mm}`);
  }

  const speed = formatRangeNumber(product.workingSpeedMpm);
  if (speed !== EMPTY) {
    parts.push(`${speed} ${labels.units.mpm}`);
  }

  const volume = formatVolumeL(product.volumeL);
  if (volume !== EMPTY) {
    parts.push(`${volume} ${labels.units.L}`);
  }

  if (product.spinRpm != null) {
    parts.push(`${product.spinRpm} ${labels.units.rpm}`);
  }

  if (product.gFactor != null) {
    parts.push(`G ${product.gFactor}`);
  }

  const airflow = formatAirflow(product.airflowM3h);
  if (airflow !== EMPTY) {
    parts.push(`${airflow} ${labels.units.m3h}`);
  }

  const noise = formatNoiseDb(product.noiseDb);
  if (noise !== EMPTY) {
    parts.push(`${noise} ${labels.units.dB}`);
  }

  const voltage = formatVoltage(product.voltage, product.voltageRaw);
  if (voltage !== EMPTY) {
    parts.push(voltage);
  }

  const dims = formatDimensionsMm(product.dimensionsMm, "en");
  if (dims !== EMPTY) {
    parts.push(`${dims} ${labels.units.mm}`);
  }

  return parts.join(" · ");
}

/**
 * Unique page description from model characteristics — never from series copy
 * (series text repeats across many models). Used for /uk and /en without EN text.
 */
export function buildProductDescription(
  product: Product,
  labels: ProductCopyLabels,
  locale = "uk",
): string {
  // Spec tail used for uniqueness; dimensions note localized when locale=en.
  const parts: string[] = [product.name, labels.category];

  const load = formatLoadKg(product.loadKg);
  if (load !== EMPTY) {
    parts.push(`${load} ${labels.units.kg}`);
  }
  if (labels.heating) {
    parts.push(labels.heating);
  }
  const power = formatPowerKw(product.powerKw);
  if (power !== EMPTY) {
    parts.push(`${power} ${labels.units.kW}`);
  }
  if (product.workingWidthMm != null) {
    parts.push(`${product.workingWidthMm} ${labels.units.mm}`);
  }
  const speed = formatRangeNumber(product.workingSpeedMpm);
  if (speed !== EMPTY) {
    parts.push(`${speed} ${labels.units.mpm}`);
  }
  const volume = formatVolumeL(product.volumeL);
  if (volume !== EMPTY) {
    parts.push(`${volume} ${labels.units.L}`);
  }
  if (product.spinRpm != null) {
    parts.push(`${product.spinRpm} ${labels.units.rpm}`);
  }
  if (product.gFactor != null) {
    parts.push(`G ${product.gFactor}`);
  }
  const airflow = formatAirflow(product.airflowM3h);
  if (airflow !== EMPTY) {
    parts.push(`${airflow} ${labels.units.m3h}`);
  }
  const noise = formatNoiseDb(product.noiseDb);
  if (noise !== EMPTY) {
    parts.push(`${noise} ${labels.units.dB}`);
  }
  const voltage = formatVoltage(product.voltage, product.voltageRaw);
  if (voltage !== EMPTY) {
    parts.push(voltage);
  }
  const dims = formatDimensionsMm(product.dimensionsMm, locale);
  if (dims !== EMPTY) {
    parts.push(`${dims} ${labels.units.mm}`);
  }

  return parts.join(" · ");
}

/**
 * /en meta / OG / JSON-LD description: EN series text + specs tail when EN exists;
 * otherwise English specs-only (never Ukrainian series copy).
 */
export function buildEnProductDescription(
  product: Product,
  labels: ProductCopyLabels,
  series: Series | null | undefined,
): string {
  const enText = seriesEnMetaText(series);
  const tail = buildProductSpecTail(product, labels);
  if (enText) {
    return `${enText} · ${product.name} · ${tail}`;
  }
  return buildProductDescription(product, labels, "en");
}

/** Short spec lines for OG images (max ~4). */
export function buildProductOgSpecs(
  product: Product,
  labels: ProductCopyLabels,
): string[] {
  const lines: string[] = [];

  const load = formatLoadKg(product.loadKg);
  if (load !== EMPTY) {
    lines.push(`${load} ${labels.units.kg}`);
  }
  if (labels.heating) {
    lines.push(labels.heating);
  }
  const power = formatPowerKw(product.powerKw);
  if (power !== EMPTY) {
    lines.push(`${power} ${labels.units.kW}`);
  }
  if (product.workingWidthMm != null) {
    lines.push(`${product.workingWidthMm} ${labels.units.mm}`);
  }
  const volume = formatVolumeL(product.volumeL);
  if (volume !== EMPTY && lines.length < 4) {
    lines.push(`${volume} ${labels.units.L}`);
  }
  const dims = formatDimensionsMm(product.dimensionsMm);
  if (dims !== EMPTY && lines.length < 4) {
    lines.push(`${dims} ${labels.units.mm}`);
  }

  return lines.slice(0, 4);
}
