import { describe, expect, it } from "vitest";

import {
  collectOverlapSlugs,
  footprintMm,
  initialPlacementMm,
  isOutOfBounds,
  moveRect,
  rectsOverlap,
  rotateQuarter,
  rotateRectAroundCenter,
  shareOfRoomPercent,
  snapMm,
  totalFootprintAreaM2,
  type FloorRect,
} from "./geometry";

describe("footprintMm", () => {
  it("keeps width and depth at 0°", () => {
    expect(footprintMm(800, 900, 0)).toEqual({ w: 800, d: 900 });
  });

  it("swaps width and depth at 90°", () => {
    expect(footprintMm(800, 900, 1)).toEqual({ w: 900, d: 800 });
    expect(footprintMm(800, 900, 3)).toEqual({ w: 900, d: 800 });
  });
});

describe("snapMm", () => {
  it("snaps to 50 mm grid", () => {
    expect(snapMm(0)).toBe(0);
    expect(snapMm(24)).toBe(0);
    expect(snapMm(25)).toBe(50);
    expect(snapMm(124)).toBe(100);
  });
});

describe("isOutOfBounds", () => {
  const roomW = 6000;
  const roomL = 4000;

  it("accepts rect fully inside room", () => {
    const rect: FloorRect = {
      xMm: 100,
      yMm: 100,
      wMm: 800,
      dMm: 900,
      rotation: 0,
    };
    expect(isOutOfBounds(rect, roomW, roomL)).toBe(false);
  });

  it("flags rect crossing room edge", () => {
    const rect: FloorRect = {
      xMm: 5500,
      yMm: 100,
      wMm: 800,
      dMm: 900,
      rotation: 0,
    };
    expect(isOutOfBounds(rect, roomW, roomL)).toBe(true);
  });

  it("uses swapped footprint after rotation", () => {
    const rect: FloorRect = {
      xMm: 5200,
      yMm: 100,
      wMm: 800,
      dMm: 900,
      rotation: 1,
    };
    expect(isOutOfBounds(rect, roomW, roomL)).toBe(true);
  });
});

describe("rectsOverlap", () => {
  const base: FloorRect = {
    xMm: 0,
    yMm: 0,
    wMm: 1000,
    dMm: 1000,
    rotation: 0,
  };

  it("detects touching footprints at gap 0", () => {
    const other: FloorRect = { ...base, xMm: 1000, yMm: 0 };
    expect(rectsOverlap(base, other, 0)).toBe(false);
    const overlap: FloorRect = { ...base, xMm: 999, yMm: 0 };
    expect(rectsOverlap(base, overlap, 0)).toBe(true);
  });

  it("respects minimum gap between machines", () => {
    const spaced: FloorRect = { ...base, xMm: 1200, yMm: 0 };
    expect(rectsOverlap(base, spaced, 200)).toBe(false);
    const tight: FloorRect = { ...base, xMm: 1100, yMm: 0 };
    expect(rectsOverlap(base, tight, 200)).toBe(true);
  });
});

describe("rotateRectAroundCenter", () => {
  it("increments rotation and keeps center", () => {
    const rect: FloorRect = {
      xMm: 100,
      yMm: 200,
      wMm: 800,
      dMm: 600,
      rotation: 0,
    };
    const rotated = rotateRectAroundCenter(rect);
    expect(rotated.rotation).toBe(rotateQuarter(0));
    const before = footprintMm(rect.wMm, rect.dMm, rect.rotation);
    const after = footprintMm(rotated.wMm, rotated.dMm, rotated.rotation);
    const cxBefore = rect.xMm + before.w / 2;
    const cyBefore = rect.yMm + before.d / 2;
    const cxAfter = rotated.xMm + after.w / 2;
    const cyAfter = rotated.yMm + after.d / 2;
    expect(cxAfter).toBe(cxBefore);
    expect(cyAfter).toBe(cyBefore);
  });
});

describe("moveRect", () => {
  it("snaps translated position", () => {
    const rect: FloorRect = {
      xMm: 0,
      yMm: 0,
      wMm: 500,
      dMm: 500,
      rotation: 0,
    };
    expect(moveRect(rect, 60, 40)).toEqual({
      ...rect,
      xMm: 50,
      yMm: 50,
    });
  });
});

describe("collectOverlapSlugs", () => {
  it("returns both slugs for overlapping pair", () => {
    const placements = [
      {
        slug: "a",
        xMm: 0,
        yMm: 0,
        wMm: 1000,
        dMm: 1000,
        rotation: 0 as const,
      },
      {
        slug: "b",
        xMm: 500,
        yMm: 0,
        wMm: 1000,
        dMm: 1000,
        rotation: 0 as const,
      },
    ];
    expect(collectOverlapSlugs(placements, 0)).toEqual(new Set(["a", "b"]));
  });
});

describe("areas", () => {
  it("sums machine footprints and room share", () => {
    const area = totalFootprintAreaM2([
      { wMm: 1000, dMm: 1000, rotation: 0 },
      { wMm: 500, dMm: 500, rotation: 1 },
    ]);
    expect(area).toBeCloseTo(1.25, 5);
    expect(shareOfRoomPercent(area, 24)).toBeCloseTo(5.208333, 3);
  });
});

describe("initialPlacementMm", () => {
  it("staggers machines on the grid", () => {
    const p0 = initialPlacementMm(0, 800, 900);
    const p1 = initialPlacementMm(1, 800, 900);
    expect(p0.xMm % 50).toBe(0);
    expect(p1.xMm).toBeGreaterThan(p0.xMm);
  });
});