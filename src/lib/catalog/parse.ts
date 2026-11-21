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

/** Ukrainian + common Cyrillic → Latin (passport-style), then ASCII slug. */
const CYR_TO_LAT: Readonly<Record<string, string>> = {
  а: "a",
  б: "b",
  в: "v",
  г: "h",
  ґ: "g",
  д: "d",
  е: "e",
  є: "ie",
  ж: "zh",
  з: "z",
  и: "y",
  і: "i",
  ї: "i",
  й: "i",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "kh",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "shch",
  ь: "",
  ю: "iu",
  я: "ia",
  ы: "y",
  э: "e",
  ё: "io",
  ъ: "",
};

export function transliterateCyrillic(input: string): string {
  let out = "";
  for (const ch of input) {
    const lower = ch.toLowerCase();
    const mapped = CYR_TO_LAT[lower];
    if (mapped === undefined) {
      out += ch;
      continue;
    }
    if (ch === lower) out += mapped;
    else out += mapped.length > 0 ? mapped[0]!.toUpperCase() + mapped.slice(1) : "";
  }
  return out;
}

/**
 * Stable URL slug from a model name.
 * Cyrillic is transliterated first so Ukrainian names stay non-empty;
 * Latin names keep the same slug as before.
 */
export function slugify(name: string): string {
  const slug = transliterateCyrillic(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (!slug) {
    throw new ParseError("Empty slug after normalization", "slug", name);
  }
  return slug;
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
    // Allowed for incomplete rows; UI hides the dimensions block when all zero.
    return { w: 0, d: 0, h: 0 };
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

export type ParseSectorsResult = {
  sectors: SectorKey[];
  /** Free-text labels not in SECTOR_BY_CSV (never used as filters). */
  sectorLabels: string[];
  unknown: string[];
};

/**
 * Accept `|` and comma separators. Known industries map to keys;
 * unknown tokens become free labels (warn upstream) — do not throw.
 * Known CSV names that contain commas (e.g. hospitality) match as a whole
 * segment first when separated by `|`.
 */
export function parseSectors(rawInput: string | undefined | null): ParseSectorsResult {
  const raw = trimCell(rawInput);
  if (!raw) return { sectors: [], sectorLabels: [], unknown: [] };

  const sectors: SectorKey[] = [];
  const sectorLabels: string[] = [];
  const unknown: string[] = [];
  const seenKey = new Set<SectorKey>();
  const seenLabel = new Set<string>();

  function addKey(key: SectorKey) {
    if (seenKey.has(key)) return;
    seenKey.add(key);
    sectors.push(key);
  }

  function addLabel(label: string) {
    if (seenLabel.has(label)) return;
    seenLabel.add(label);
    sectorLabels.push(label);
    unknown.push(label);
  }

  const pipeParts = raw.split("|").map((p) => p.trim()).filter(Boolean);
  for (const part of pipeParts) {
    const direct = SECTOR_BY_CSV[part];
    if (direct) {
      addKey(direct);
      continue;
    }
    const commaParts = part.split(",").map((p) => p.trim()).filter(Boolean);
    if (commaParts.length <= 1) {
      addLabel(part);
      continue;
    }
    for (const sub of commaParts) {
      const key = SECTOR_BY_CSV[sub];
      if (key) addKey(key);
      else addLabel(sub);
    }
  }

  return { sectors, sectorLabels, unknown };
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

export type DescriptionBlock = {
  kind: "heading" | "bullet";
  text: string;
};

const HEADING_ALIASES: Readonly<Record<string, string>> = {
  комплектація: "Комплектація",
  "до складу входять:": "До складу входять:",
  "до складу входять": "До складу входять:",
};

function sentenceCaseHeading(line: string): string | null {
  const key = line.replace(/\s+/g, " ").trim().toLowerCase();
  return HEADING_ALIASES[key] ?? null;
}

/** Collapse whitespace; split full description into headings + • bullets. */
export function normalizeDescription(rawInput: string | undefined | null): {
  text: string;
  bullets: string[];
  blocks: DescriptionBlock[];
} {
  const raw = (rawInput ?? "").replace(/\r\n/g, "\n").trim();
  if (!raw) return { text: "", bullets: [], blocks: [] };

  const collapsed = raw.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n");
  const blocks: DescriptionBlock[] = [];
  const bullets: string[] = [];

  const lines = collapsed.split("\n");
  for (const lineRaw of lines) {
    const line = lineRaw.replace(/\s+/g, " ").trim();
    if (!line) continue;

    const heading = sentenceCaseHeading(line.replace(/•/g, "").trim());
    if (heading && !line.includes("•")) {
      blocks.push({ kind: "heading", text: heading });
      continue;
    }

    if (line.includes("•")) {
      const parts = line.split("•").map((p) => p.replace(/\s+/g, " ").trim());
      for (let i = 0; i < parts.length; i += 1) {
        const part = parts[i]!;
        if (!part) continue;
        if (i === 0) {
          const leadHeading = sentenceCaseHeading(part);
          if (leadHeading) {
            blocks.push({ kind: "heading", text: leadHeading });
            continue;
          }
          if (parts.length === 1) {
            blocks.push({ kind: "bullet", text: part });
            bullets.push(part);
          }
          continue;
        }
        blocks.push({ kind: "bullet", text: part });
        bullets.push(part);
      }
      continue;
    }

    blocks.push({ kind: "bullet", text: line });
    bullets.push(line);
  }

  // No • and no recognized headings → single prose blob as before (no fake bullets).
  if (!collapsed.includes("•") && blocks.every((b) => b.kind === "bullet")) {
    const text = collapsed.replace(/\s+/g, " ").trim();
    return { text, bullets: [], blocks: [] };
  }

  return {
    text: collapsed.replace(/\s+/g, " ").trim(),
    bullets,
    blocks,
  };
}
