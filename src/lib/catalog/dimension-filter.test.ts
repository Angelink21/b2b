import { describe, expect, it } from "vitest";

import type { CatalogIndexItem } from "./schema";

import {
  countHiddenWithoutDimensions,
  dimensionFilterActive,
  hasCatalogDimensions,
  itemMatchesDimensionFilter,
} from "./dimension-filter";

function row(
  dims: { w: number; d: number; h: number },
  slug = "a",
): CatalogIndexItem {
  return {
    slug,
    name: slug,
    category: "washers",
    heating: null,
    loadKg: { min: 10, max: 10 },
    powerKwMax: 5,
    dimensionsMm: dims,
    familyId: "f",
    variantLabel: null,
    volumeL: null,
    gFactor: null,
    spinRpm: null,
    workingWidthMm: null,
    workingSpeedMpm: null,
    shaftDiameterMm: null,
  };
}

describe("dimension filter", () => {
  it("treats zero sizes as missing dimensions", () => {
    expect(hasCatalogDimensions(row({ w: 0, d: 100, h: 100 }))).toBe(false);
  });

  it("matches inclusive max bounds per axis", () => {
    const item = row({ w: 700, d: 800, h: 900 });
    expect(itemMatchesDimensionFilter(item, { w: 700 })).toBe(true);
    expect(itemMatchesDimensionFilter(item, { w: 699 })).toBe(false);
    expect(itemMatchesDimensionFilter(item, { h: 899, d: 800 })).toBe(false);
  });

  it("hides items without dimensions when any max is set", () => {
    const bad = row({ w: 0, d: 0, h: 0 }, "bad");
    const good = row({ w: 600, d: 600, h: 1000 }, "good");
    expect(itemMatchesDimensionFilter(bad, { w: 1000 })).toBe(false);
    expect(
      countHiddenWithoutDimensions([bad, good], { w: 1000 }),
    ).toBe(1);
    expect(dimensionFilterActive({ w: 1000 })).toBe(true);
    expect(dimensionFilterActive({})).toBe(false);
  });
});