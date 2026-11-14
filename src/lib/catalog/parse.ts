/**
 * Field parsers for DATA_CONTRACT formats.
 * Unknown semantics are not interpreted — only numbers for filter/sort.
 */

import { SECTOR_BY_CSV, type HeatingKey, type SectorKey } from "./schema";

export class ParseError extends Error {
  constructor(
    message: string,
    readonly field: string,
    readonly raw: string,
  ) {
    super(message);
    this.name = "ParseError";
  }
}

function trimCell(value: string | undefined | null): string {
  return (value ?? "").trim();
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function parseLoadKg(
  rawInput: string | undefined | null,
): { raw: string; min: number; max: number; multiplier?: number } | null {
  const raw = trimCell(rawInput);
  if (!raw) return null;

  // `# x # - # x #` e.g. `11.7 x 2 - 10.5 x 2`
  const multiRange = raw.match(
    /^([\d.]+)\s*x\s*(\d+)\s*-\s*([\d.]+)\s*x\s*(\d+)$/i,
  );
  if (multiRange) {
    const a = Number(multiRange[1]);
    const m1 = Number(multiRange[2]);
    const b = Number(multiRange[3]);
    const m2 = Number(multiRange[4]);
    if (![a, m1, b, m2].every(Number.isFinite)) {
      throw new ParseError("Invalid loadKg multi-range", "loadKg", raw);
    }
    const nums = [a!, b!];
    const result: {
      raw: string;
      min: number;
      max: number;
      multiplier?: number;
    } = {
      raw,
      min: Math.min(...nums),
      max: Math.max(...nums),
    };
    if (m1 === m2) result.multiplier = m1;
    return result;
  }

  // `#-#/#-#` e.g. `18.3-16.5/18-20`
  if (raw.includes("/")) {
    const numbers = raw.match(/[\d.]+/g)?.map(Number) ?? [];
    if (numbers.length < 2 || !numbers.every(Number.isFinite)) {
      throw new ParseError("Invalid loadKg slash range", "loadKg", raw);
    }
    return {
      raw,
      min: Math.min(...numbers),
      max: Math.max(...numbers),
    };
  }

  // `#-#` e.g. `8-9`
  const range = raw.match(/^([\d.]+)\s*-\s*([\d.]+)$/);
  if (range) {
    const a = Number(range[1]);
    const b = Number(range[2]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      throw new ParseError("Invalid loadKg range", "loadKg", raw);
    }
    return { raw, min: Math.min(a, b), max: Math.max(a, b) };
  }

  // `#`
  const single = Number(raw);
  if (!Number.isFinite(single)) {
    throw new ParseError("Invalid loadKg value", "loadKg", raw);
  }
  return { raw, min: single, max: single };
}

export function parsePowerKw(
  rawInput: string | undefined | null,
): { raw: string; max: number; alt?: number } | null {
  const raw = trimCell(rawInput);
  if (!raw) return null;

  // `# (#)` e.g. `51 (39)` — max is the larger; alt is the parenthetical
  const paren = raw.match(/^([\d.]+)\s*\(([\d.]+)\)$/);
  if (paren) {
    const a = Number(paren[1]);
    const b = Number(paren[2]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      throw new ParseError("Invalid powerKw paren", "powerKw", raw);
    }
    return { raw, max: Math.max(a, b), alt: b };
  }

  // `#/#` e.g. `2.2/14.2`
  const slash = raw.match(/^([\d.]+)\s*\/\s*([\d.]+)$/);
  if (slash) {
    const a = Number(slash[1]);
    const b = Number(slash[2]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      throw new ParseError("Invalid powerKw slash", "powerKw", raw);
    }
    return { raw, max: Math.max(a, b), alt: Math.min(a, b) };
  }

  const n = Number(raw);
  if (!Number.isFinite(n)) {
    throw new ParseError("Invalid powerKw value", "powerKw", raw);
  }
  return { raw, max: n };
}

export function parseDimensionsMm(
  rawInput: string | undefined | null,
): { w: number; d: number; h: number; note?: string } {
  const raw = trimCell(rawInput);
  if (!raw) {
    throw new ParseError("Missing dimensions", "dimensionsMm", raw);
  }

  // `# (з колесами) x # x #`
  const withNote = raw.match(
    /^([\d.]+)\s*\(([^)]+)\)\s*[x×]\s*([\d.]+)\s*[x×]\s*([\d.]+)$/i,
  );
  if (withNote) {
    const w = Number(withNote[1]);
    const note = withNote[2]!.trim();
    const d = Number(withNote[3]);
    const h = Number(withNote[4]);
    if (![w, d, h].every(Number.isFinite)) {
      throw new ParseError("Invalid dimensions with note", "dimensionsMm", raw);
    }
    return { w, d, h, note };
  }

  // `#x#x#`
  const plain = raw.match(
    /^([\d.]+)\s*[x×]\s*([\d.]+)\s*[x×]\s*([\d.]+)$/i,
  );
  if (plain) {
    const w = Number(plain[1]);
    const d = Number(plain[2]);
    const h = Number(plain[3]);
    if (![w, d, h].every(Number.isFinite)) {
      throw new ParseError("Invalid dimensions", "dimensionsMm", raw);
    }
    return { w, d, h };
  }

  throw new ParseError("Unrecognized dimensions format", "dimensionsMm", raw);
}

export function parseNoiseDb(
  rawInput: string | undefined | null,
): { value: number; lessThan?: boolean; alt?: number } | null {
  const raw = trimCell(rawInput);
  if (!raw) return null;

  // `<#`
  const less = raw.match(/^<\s*([\d.]+)$/);
  if (less) {
    const value = Number(less[1]);
    if (!Number.isFinite(value)) {
      throw new ParseError("Invalid noiseDb lessThan", "noiseDb", raw);
    }
    return { value, lessThan: true };
  }

  // `#/#`
  const slash = raw.match(/^([\d.]+)\s*\/\s*([\d.]+)$/);
  if (slash) {
    const a = Number(slash[1]);
    const b = Number(slash[2]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      throw new ParseError("Invalid noiseDb slash", "noiseDb", raw);
    }
    return { value: a, alt: b };
  }

  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new ParseError("Invalid noiseDb value", "noiseDb", raw);
  }
  return { value };
}

export function parseVolumeL(
  rawInput: string | undefined | null,
): { raw: string; value: number; multiplier?: number } | null {
  const raw = trimCell(rawInput);
  if (!raw) return null;

  // `#x#` e.g. `77x2`
  const multi = raw.match(/^([\d.]+)\s*[x×]\s*(\d+)$/i);
  if (multi) {
    const value = Number(multi[1]);
    const multiplier = Number(multi[2]);
    if (!Number.isFinite(value) || !Number.isFinite(multiplier)) {
      throw new ParseError("Invalid volumeL multi", "volumeL", raw);
    }
    return { raw, value, multiplier };
  }

  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new ParseError("Invalid volumeL value", "volumeL", raw);
  }
  return { raw, value };
}

export function parseWorkingSpeedMpm(
  rawInput: string | undefined | null,
): { raw: string; min: number; max: number } | null {
  const raw = trimCell(rawInput);
  if (!raw) return null;

  const range = raw.match(/^([\d.]+)\s*-\s*([\d.]+)$/);
  if (range) {
    const a = Number(range[1]);
    const b = Number(range[2]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      throw new ParseError("Invalid workingSpeedMpm range", "workingSpeedMpm", raw);
    }
    return { raw, min: Math.min(a, b), max: Math.max(a, b) };
  }

  const n = Number(raw);
  if (!Number.isFinite(n)) {
    throw new ParseError("Invalid workingSpeedMpm value", "workingSpeedMpm", raw);
  }
  return { raw, min: n, max: n };
}

export function parseAirflowM3h(
  rawInput: string | undefined | null,
): { raw: string; value: number; multiplier?: number } | null {
  const raw = trimCell(rawInput);
  if (!raw) return null;

  // `# x #` e.g. `500 x 2`
  const multi = raw.match(/^([\d.]+)\s*[x×]\s*(\d+)$/i);
  if (multi) {
    const value = Number(multi[1]);
    const multiplier = Number(multi[2]);
    if (!Number.isFinite(value) || !Number.isFinite(multiplier)) {
      throw new ParseError("Invalid airflowM3h multi", "airflowM3h", raw);
    }
    return { raw, value, multiplier };
  }

  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new ParseError("Invalid airflowM3h value", "airflowM3h", raw);
  }
  return { raw, value };
}

export function parseVoltage(
  rawInput: string | undefined | null,
): { variants: string[]; raw: string } | null {
  const raw = trimCell(rawInput);
  if (!raw) return null;
  const variants = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return { variants, raw };
}

export function parseHeating(
  rawInput: string | undefined | null,
): { heating: HeatingKey | null; heatingVariant?: string } {
  const raw = trimCell(rawInput);
  if (!raw) return { heating: null };

  const variantMatch = raw.match(/^Газовий\s*\((.+)\)$/i);
  if (variantMatch) {
    return { heating: "gas", heatingVariant: variantMatch[1]!.trim() };
  }

  switch (raw) {
    case "Електричний":
      return { heating: "electric" };
    case "Паровий":
      return { heating: "steam" };
    case "Газовий":
      return { heating: "gas" };
    case "Гаряча вода":
      return { heating: "hot-water" };
    case "Комбінований":
      return { heating: "combined" };
    default:
      throw new ParseError("Unknown heating value", "heating", raw);
  }
}

export function parseSectors(rawInput: string | undefined | null): SectorKey[] {
  const raw = trimCell(rawInput);
  if (!raw) return [];
  const parts = raw.split("|").map((p) => p.trim()).filter(Boolean);
  const result: SectorKey[] = [];
  for (const part of parts) {
    const key = SECTOR_BY_CSV[part];
    if (!key) {
      throw new ParseError("Unknown sector", "sectors", part);
    }
    result.push(key);
  }
  return result;
}

export function parseOptionalNumber(
  rawInput: string | undefined | null,
  field: string,
): number | null {
  const raw = trimCell(rawInput);
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    throw new ParseError(`Invalid number for ${field}`, field, raw);
  }
  return n;
}

/** Number or `#-#` range (e.g. boilerPowerKw `6-7.5`). */
export function parseOptionalRangeNumber(
  rawInput: string | undefined | null,
  field: string,
): { raw: string; min: number; max: number } | null {
  const raw = trimCell(rawInput);
  if (!raw) return null;

  const range = raw.match(/^([\d.]+)\s*-\s*([\d.]+)$/);
  if (range) {
    const a = Number(range[1]);
    const b = Number(range[2]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      throw new ParseError(`Invalid range for ${field}`, field, raw);
    }
    return { raw, min: Math.min(a, b), max: Math.max(a, b) };
  }

  const n = Number(raw);
  if (!Number.isFinite(n)) {
    throw new ParseError(`Invalid number for ${field}`, field, raw);
  }
  return { raw, min: n, max: n };
}

/** Collapse whitespace; split full description on • into bullets. */
export function normalizeDescription(rawInput: string | undefined | null): {
  text: string;
  bullets: string[];
} {
  const raw = (rawInput ?? "").replace(/\r\n/g, "\n").trim();
  if (!raw) return { text: "", bullets: [] };

  const collapsed = raw.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n");

  if (collapsed.includes("•")) {
    const bullets = collapsed
      .split("•")
      .map((part) => part.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    return { text: collapsed.replace(/\s+/g, " ").trim(), bullets };
  }

  return { text: collapsed.replace(/\s+/g, " ").trim(), bullets: [] };
}
