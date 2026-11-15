import type { Product } from "./schema";

export const LINEUP_SIZE = 8;
export const RANGE_UNIT_MIN = 0;
export const RANGE_UNIT_MAX = 1000;
/** Static start matching prototype post-tween (stage 8 adds motion). */
export const INITIAL_RANGE_UNIT = { lo: 330, hi: 650 } as const;

export type LineupModel = {
  slug: string;
  name: string;
  kgMax: number;
  dimensionsMm: { w: number; d: number; h: number };
};

type WasherCandidate = Product & {
  loadKg: NonNullable<Product["loadKg"]>;
};

function isWasherWithKgAndDims(p: Product): p is WasherCandidate {
  return (
    p.category === "washers" &&
    p.loadKg !== null &&
    Number.isFinite(p.loadKg.max) &&
    Number.isFinite(p.dimensionsMm.w) &&
    Number.isFinite(p.dimensionsMm.h)
  );
}

/**
 * Hero lineup keeps one visual language (front-loaders with a porthole).
 * Barrier / medical / foreign brands stay in the catalog, not on the floor row.
 */
export function isLineupFloorModel(p: Product): boolean {
  return /^(LA|LAP|LN)-/i.test(p.name);
}

/** Prefer electric when available; otherwise first catalog order at that kg. */
function pickLineupRepresentative(
  candidates: readonly WasherCandidate[],
): WasherCandidate {
  const electric = candidates.filter((p) => p.heating === "electric");
  return (electric[0] ?? candidates[0])!;
}

/**
 * Floor-row silhouette size from catalog mm.
 * Depth excess grows width (and a milder height bump) so models that only grow
 * in D (e.g. LA-60C vs LA-80C) still step up between neighbors on the lineup.
 */
export function lineupFloorSizeMm(
  widthMm: number,
  depthMm: number,
  heightMm: number,
): { widthMm: number; heightMm: number } {
  const excess = Math.max(0, depthMm - widthMm);
  const floorW = Math.round(widthMm + excess * 1.75);
  const grow = floorW / Math.max(widthMm, 1);
  const floorH = Math.round(heightMm * (1 + (grow - 1) * 0.5));
  return { widthMm: floorW, heightMm: floorH };
}

/**
 * Pick 8 washers evenly across unique kgMax (includes min and max).
 * Prefers LA/LAP/LN front-loaders so the floor row stays one visual language.
 */
export function selectLineup(products: readonly Product[]): LineupModel[] {
  const allWashers = products.filter(isWasherWithKgAndDims);
  const floorWashers = allWashers.filter(isLineupFloorModel);
  const washers = floorWashers.length >= LINEUP_SIZE ? floorWashers : allWashers;
  const uniqueKg = [...new Set(washers.map((m) => m.loadKg.max))].sort(
    (a, b) => a - b,
  );

  if (uniqueKg.length === 0) return [];

  const last = uniqueKg.length - 1;
  const pickedKg = [
    ...new Set(
      Array.from({ length: LINEUP_SIZE }, (_, i) => {
        const idx = Math.round((i * last) / (LINEUP_SIZE - 1));
        return uniqueKg[idx]!;
      }),
    ),
  ];

  return pickedKg.map((kg) => {
    const atKg = washers.filter((w) => w.loadKg.max === kg);
    const m = pickLineupRepresentative(atKg);
    return {
      slug: m.slug,
      name: m.name,
      kgMax: m.loadKg.max,
      dimensionsMm: {
        w: m.dimensionsMm.w,
        d: m.dimensionsMm.d,
        h: m.dimensionsMm.h,
      },
    };
  });
}

/**
 * Place a 0…1000 ruler unit on the piecewise centers of the lineup machines.
 * Centers are fractions of the row width, one per anchor, left to right.
 */
export function unitToFraction(unit: number, centers: readonly number[]): number {
  const n = centers.length;
  if (n === 0) return 0;
  if (n === 1) return centers[0]!;
  const clamped = Math.min(RANGE_UNIT_MAX, Math.max(RANGE_UNIT_MIN, unit));
  const x = (clamped / RANGE_UNIT_MAX) * (n - 1);
  const i = Math.min(Math.floor(x), n - 2);
  const t = x - i;
  const start = centers[i] ?? 0;
  const end = centers[i + 1] ?? start;
  return start + (end - start) * t;
}

/** Inverse of unitToFraction. Pointer x on the row becomes a ruler unit. */
export function fractionToUnit(fraction: number, centers: readonly number[]): number {
  const n = centers.length;
  if (n < 2) return RANGE_UNIT_MIN;
  const first = centers[0]!;
  const last = centers[n - 1]!;
  const f = Math.min(last, Math.max(first, fraction));
  let i = 0;
  while (i < n - 2 && f > (centers[i + 1] ?? f)) i += 1;
  const start = centers[i] ?? first;
  const end = centers[i + 1] ?? start;
  const t = end === start ? 0 : (f - start) / (end - start);
  return Math.round(((i + t) / (n - 1)) * RANGE_UNIT_MAX);
}

/** Map dual-range unit (0…1000) onto nonlinear kg anchors under machines. */
export function kgFromUnit(unit: number, anchors: readonly number[]): number {
  if (anchors.length === 0) return 0;
  if (anchors.length === 1) return anchors[0]!;
  const clamped = Math.min(RANGE_UNIT_MAX, Math.max(RANGE_UNIT_MIN, unit));
  const x = (clamped / RANGE_UNIT_MAX) * (anchors.length - 1);
  const i = Math.min(Math.floor(x), anchors.length - 2);
  const a = anchors[i]!;
  const b = anchors[i + 1]!;
  return a + (b - a) * (x - i);
}

export function isFullRange(lo: number, hi: number): boolean {
  return lo <= RANGE_UNIT_MIN && hi >= RANGE_UNIT_MAX;
}

export type KgPair = readonly [number, number];

/**
 * Count catalog models whose loadKg overlaps [loKg, hiKg].
 * Full unit range → totalLength (all models, matching prototype).
 */
export function countModelsInKgRange(
  kgPairs: readonly KgPair[],
  loKg: number,
  hiKg: number,
  options?: { fullRange?: boolean; totalLength?: number },
): number {
  if (options?.fullRange) {
    return options.totalLength ?? kgPairs.length;
  }
  const lo = Math.min(loKg, hiKg);
  const hi = Math.max(loKg, hiKg);
  let n = 0;
  for (const [min, max] of kgPairs) {
    if (max >= lo - 0.01 && min <= hi + 0.01) n += 1;
  }
  return n;
}

/** Whether a lineup machine kgMax sits inside the selected kg window. */
export function isLineupMachineInRange(
  kgMax: number,
  loKg: number,
  hiKg: number,
  fullRange: boolean,
): boolean {
  if (fullRange) return true;
  const lo = Math.min(loKg, hiKg);
  const hi = Math.max(loKg, hiKg);
  return kgMax >= lo - 0.01 && kgMax <= hi + 0.01;
}

export function indexKgPairs(
  items: readonly { loadKg: { min: number; max: number } | null }[],
): KgPair[] {
  const pairs: KgPair[] = [];
  for (const item of items) {
    if (item.loadKg) {
      pairs.push([item.loadKg.min, item.loadKg.max]);
    }
  }
  return pairs;
}
