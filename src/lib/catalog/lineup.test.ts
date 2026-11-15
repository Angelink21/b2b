import { describe, expect, it } from "vitest";

import { getAll, getIndex } from "./index";
import {
  countModelsInKgRange,
  indexKgPairs,
  INITIAL_RANGE_UNIT,
  fractionToUnit,
  isFullRange,
  kgFromUnit,
  lineupFloorSizeMm,
  LINEUP_SIZE,
  RANGE_UNIT_MAX,
  RANGE_UNIT_MIN,
  selectLineup,
  unitToFraction,
} from "./lineup";

describe("selectLineup", () => {
  it("returns 8 washers including unique kg min and max", () => {
    const lineup = selectLineup(getAll());
    expect(lineup).toHaveLength(LINEUP_SIZE);

    const washers = getAll().filter((p) => p.category === "washers" && p.loadKg);
    const unique = [...new Set(washers.map((p) => p.loadKg!.max))].sort((a, b) => a - b);

    expect(lineup[0]!.kgMax).toBe(unique[0]);
    expect(lineup[lineup.length - 1]!.kgMax).toBe(unique[unique.length - 1]);
  });

  it("is deterministic", () => {
    const a = selectLineup(getAll()).map((m) => m.slug);
    const b = selectLineup(getAll()).map((m) => m.slug);
    expect(a).toEqual(b);
    expect(a).toEqual([
      "lap-08-tp2-e-v",
      "la-14-tp2-e",
      "la-18-tp2-e",
      "la-28-tp2-e",
      "la-35c-tp2-e",
      "la-60c-tp2-e",
      "la-80c-tp2-e",
      "la-120c-tp2-hw",
    ]);
  });

  it("keeps front-loader form factors only", () => {
    const lineup = selectLineup(getAll());
    expect(lineup.every((m) => /^(LA|LAP|LN)-/i.test(m.name))).toBe(true);
    expect(lineup.some((m) => /^LBS-/i.test(m.name))).toBe(false);
  });
});

describe("lineupFloorSizeMm", () => {
  it("amplifies depth so LA-80C reads larger than LA-60C", () => {
    const sixty = lineupFloorSizeMm(1420, 1433, 1890);
    const eighty = lineupFloorSizeMm(1420, 1645, 1890);
    expect(eighty.widthMm).toBeGreaterThan(sixty.widthMm + 200);
    expect(eighty.heightMm).toBeGreaterThan(sixty.heightMm + 80);
  });
});

describe("kgFromUnit", () => {
  it("maps endpoints to first and last anchors", () => {
    const anchors = selectLineup(getAll()).map((m) => m.kgMax);
    expect(kgFromUnit(RANGE_UNIT_MIN, anchors)).toBe(anchors[0]);
    expect(kgFromUnit(RANGE_UNIT_MAX, anchors)).toBe(anchors[anchors.length - 1]);
  });

  it("interpolates between adjacent anchors", () => {
    const anchors = [10, 20, 40];
    // unit 500 → midpoint between first and last index → between 10 and 20
    expect(kgFromUnit(500, anchors)).toBeCloseTo(20, 5);
  });
});

describe("unitToFraction", () => {
  const centers = [0.1, 0.4, 0.9];

  it("lands on machine centers at the anchors", () => {
    expect(unitToFraction(0, centers)).toBeCloseTo(0.1);
    expect(unitToFraction(500, centers)).toBeCloseTo(0.4);
    expect(unitToFraction(1000, centers)).toBeCloseTo(0.9);
  });

  it("inverts a point between machines", () => {
    const unit = fractionToUnit(0.25, centers);
    expect(unitToFraction(unit, centers)).toBeCloseTo(0.25, 1);
  });
});

describe("range helpers", () => {
  it("detects full unit range", () => {
    expect(isFullRange(0, 1000)).toBe(true);
    expect(isFullRange(INITIAL_RANGE_UNIT.lo, INITIAL_RANGE_UNIT.hi)).toBe(false);
  });

  it("counts overlapping kg pairs; full range uses total catalog size", () => {
    const index = getIndex();
    const pairs = indexKgPairs(index);
    expect(pairs.length).toBeGreaterThan(0);

    const all = countModelsInKgRange(pairs, 0, 0, {
      fullRange: true,
      totalLength: index.length,
    });
    expect(all).toBe(index.length);

    const mid = countModelsInKgRange(pairs, 20, 40);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(index.length);
  });
});
