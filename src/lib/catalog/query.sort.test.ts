import { describe, expect, it } from "vitest";

import {
  compareCatalogNames,
  defaultCatalogSort,
  sortProducts,
} from "./query";
import type { CatalogIndexItem } from "./schema";

function stub(
  partial: Pick<CatalogIndexItem, "slug" | "name" | "category"> &
    Partial<CatalogIndexItem>,
): CatalogIndexItem {
  return {
    heating: null,
    loadKg: null,
    powerKwMax: null,
    dimensionsMm: { w: 0, d: 0, h: 0 },
    familyId: partial.slug,
    variantLabel: null,
    volumeL: null,
    gFactor: null,
    spinRpm: null,
    workingWidthMm: null,
    workingSpeedMpm: null,
    shaftDiameterMm: null,
    ...partial,
  };
}

describe("catalog name collator", () => {
  it("orders LA series naturally (11 before 100C)", () => {
    const names = [
      "LA-100C",
      "LA-11",
      "LA-120C",
      "LA-14",
      "LA-18",
      "LA-22",
      "LA-25",
      "LA-28",
      "LA-35",
      "LA-45",
      "LA-60",
      "LA-80",
    ];
    const sorted = [...names].sort(compareCatalogNames);
    expect(sorted).toEqual([
      "LA-11",
      "LA-14",
      "LA-18",
      "LA-22",
      "LA-25",
      "LA-28",
      "LA-35",
      "LA-45",
      "LA-60",
      "LA-80",
      "LA-100C",
      "LA-120C",
    ]);
  });
});

describe("defaultCatalogSort", () => {
  it("picks the key metric per category", () => {
    expect(defaultCatalogSort("washers")).toEqual({ by: "kg", dir: "asc" });
    expect(defaultCatalogSort("flatwork-ironers")).toEqual({
      by: "width",
      dir: "asc",
    });
    expect(defaultCatalogSort("laundry-carts")).toEqual({
      by: "volume",
      dir: "asc",
    });
    expect(defaultCatalogSort("finishing")).toEqual({
      by: "power",
      dir: "asc",
    });
    expect(defaultCatalogSort(null)).toEqual({ by: "key", dir: "asc" });
  });
});

describe("sortProducts", () => {
  it("sorts by name with natural collator", () => {
    const items = [
      stub({ slug: "a", name: "LA-100C", category: "washers" }),
      stub({ slug: "b", name: "LA-11", category: "washers" }),
      stub({ slug: "c", name: "LA-120C", category: "washers" }),
      stub({ slug: "d", name: "LA-14", category: "washers" }),
    ];
    expect(
      sortProducts(items, { by: "name", dir: "asc" }).map((r) => r.name),
    ).toEqual(["LA-11", "LA-14", "LA-100C", "LA-120C"]);
  });

  it("ties numeric sort with natural name", () => {
    const items = [
      stub({
        slug: "a",
        name: "LA-100C TP2 E",
        category: "washers",
        loadKg: { min: 100, max: 100 },
      }),
      stub({
        slug: "b",
        name: "LA-11 TP2 E",
        category: "washers",
        loadKg: { min: 11, max: 11 },
      }),
      stub({
        slug: "c",
        name: "LAP-08 TP2 E V",
        category: "washers",
        loadKg: { min: 8, max: 9 },
      }),
      stub({
        slug: "d",
        name: "LAP-08 TP2 E P",
        category: "washers",
        loadKg: { min: 8, max: 9 },
      }),
    ];
    expect(
      sortProducts(items, { by: "kg", dir: "asc" }).map((r) => r.name),
    ).toEqual([
      "LAP-08 TP2 E P",
      "LAP-08 TP2 E V",
      "LA-11 TP2 E",
      "LA-100C TP2 E",
    ]);
  });

  it("groups by menu category order on All default", () => {
    const items = [
      stub({
        slug: "d",
        name: "B",
        category: "dryers",
        loadKg: { min: 10, max: 10 },
      }),
      stub({
        slug: "w",
        name: "A",
        category: "washers",
        loadKg: { min: 20, max: 20 },
      }),
      stub({
        slug: "w2",
        name: "C",
        category: "washers",
        loadKg: { min: 10, max: 10 },
      }),
    ];
    expect(
      sortProducts(items, { by: "key", dir: "asc" }, { groupByCategory: true }).map(
        (r) => r.slug,
      ),
    ).toEqual(["w2", "w", "d"]);
  });
});
