import { describe, expect, it } from "vitest";

import {
  buildCompareMatrix,
  filterDiffRows,
  sharedSilhouetteScale,
  toCompareRecord,
} from "./compare";
import { getAll, getBySlug } from "./index";
import { COMPARE_MAX, parseAsModelSlugs } from "./search-params";

const HEATING = {
  electric: "Electric",
  steam: "Steam",
  gas: "Gas",
  "hot-water": "Hot water",
  combined: "Combined",
};

describe("parseAsModelSlugs", () => {
  it("parses unique slugs and caps at COMPARE_MAX", () => {
    const parsed = parseAsModelSlugs.parse(
      "a, b, a, c, d, e, f",
    );
    expect(parsed).toEqual(["a", "b", "c", "d"]);
    expect(parsed?.length).toBe(COMPARE_MAX);
  });

  it("returns null for empty", () => {
    expect(parseAsModelSlugs.parse("")).toBeNull();
    expect(parseAsModelSlugs.parse("  , , ")).toBeNull();
  });

  it("serializes with comma join", () => {
    expect(parseAsModelSlugs.serialize(["x", "y"])).toBe("x,y");
  });
});

describe("buildCompareMatrix", () => {
  it("unions non-empty fields and uses dash for missing", () => {
    const all = getAll();
    const a = all.find((p) => p.loadKg && p.heating);
    const b = all.find(
      (p) =>
        p.slug !== a?.slug &&
        p.category !== a?.category &&
        p.volumeL &&
        !p.loadKg,
    );
    expect(a && b).toBeTruthy();
    if (!a || !b) return;

    const matrix = buildCompareMatrix(
      [toCompareRecord(a), toCompareRecord(b)],
      HEATING,
    );
    expect(matrix.slugs).toEqual([a.slug, b.slug]);
    expect(matrix.rows.length).toBeGreaterThan(0);

    const loadRow = matrix.rows.find((r) => r.key === "loadKg");
    expect(loadRow?.values[0]).not.toBe("—");
    expect(loadRow?.values[1]).toBe("—");

    const dimRow = matrix.rows.find((r) => r.key === "dimensionsMm");
    expect(dimRow).toBeTruthy();
  });
});

describe("filterDiffRows", () => {
  it("keeps only rows with differing filled values", () => {
    const washers = getAll().filter((p) => p.category === "washers");
    const first = washers[0];
    const second = washers.find(
      (p) =>
        p.slug !== first?.slug &&
        p.loadKg?.raw !== first?.loadKg?.raw,
    );
    expect(first && second).toBeTruthy();
    if (!first || !second) return;

    const matrix = buildCompareMatrix(
      [toCompareRecord(first), toCompareRecord(second)],
      HEATING,
    );
    const diffs = filterDiffRows(matrix);
    expect(diffs.rows.length).toBeGreaterThan(0);
    expect(diffs.rows.length).toBeLessThanOrEqual(matrix.rows.length);
    for (const row of diffs.rows) {
      const filled = row.values.filter((v) => v !== "—");
      expect(new Set(filled).size).toBeGreaterThan(1);
    }
  });
});

describe("sharedSilhouetteScale", () => {
  it("uses the largest machine for scale", () => {
    const small = getBySlug("lap-08-tp2-e") ?? getAll()[0];
    const large = getAll().reduce((acc, p) => {
      const m = Math.max(p.dimensionsMm.w, p.dimensionsMm.h);
      const am = Math.max(acc.dimensionsMm.w, acc.dimensionsMm.h);
      return m > am ? p : acc;
    });
    expect(small).toBeTruthy();
    if (!small) return;

    const scaleBoth = sharedSilhouetteScale(
      [toCompareRecord(small), toCompareRecord(large)],
      200,
    );
    const scaleLarge = sharedSilhouetteScale([toCompareRecord(large)], 200);
    expect(scaleBoth).toBeCloseTo(scaleLarge, 6);
  });
});
