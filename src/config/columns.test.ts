import { describe, expect, it } from "vitest";

import { CATEGORY_SLUGS } from "@/lib/catalog/schema";

import { getCatalogColumnIds, getCatalogColumns } from "./columns";

describe("catalog columns", () => {
  it("default (all categories) includes type and load", () => {
    expect(getCatalogColumnIds(null)).toEqual([
      "name",
      "type",
      "loadKg",
      "power",
      "heating",
      "dimensions",
    ]);
  });

  it("washers expose g-factor and spin", () => {
    expect(getCatalogColumnIds("washers")).toContain("gFactor");
    expect(getCatalogColumnIds("washers")).toContain("spinRpm");
    expect(getCatalogColumnIds("washers")).not.toContain("type");
  });

  it("flatwork ironers expose width and speed", () => {
    const ids = getCatalogColumnIds("flatwork-ironers");
    expect(ids).toContain("workingWidthMm");
    expect(ids).toContain("workingSpeedMpm");
    expect(ids).toContain("shaftDiameterMm");
  });

  it("laundry carts expose volume only (no heating column)", () => {
    const ids = getCatalogColumnIds("laundry-carts");
    expect(ids).toEqual(["name", "volumeL", "dimensions"]);
  });

  it("every category has a column matrix", () => {
    for (const slug of CATEGORY_SLUGS) {
      const cols = getCatalogColumns(slug);
      expect(cols.length).toBeGreaterThan(0);
      expect(cols[0]?.id).toBe("name");
    }
  });
});
