import { describe, expect, it } from "vitest";

import { CATEGORY_SLUGS } from "@/lib/catalog/schema";

import {
  assertNoRequiredNarrowHide,
  getCatalogColumnIds,
  getCatalogColumns,
} from "./columns";

describe("catalog columns", () => {
  it("default (all categories) uses a compact key-metric column", () => {
    expect(getCatalogColumnIds(null)).toEqual([
      "name",
      "type",
      "heating",
      "dimensions",
      "keyMetric",
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

  it("never marks required columns as narrowHide", () => {
    expect(assertNoRequiredNarrowHide(getCatalogColumns(null))).toBe(true);
    for (const slug of CATEGORY_SLUGS) {
      expect(assertNoRequiredNarrowHide(getCatalogColumns(slug))).toBe(true);
    }
  });

  it("dryers keep dimensions visible (not narrowHide)", () => {
    const dims = getCatalogColumns("dryers").find((c) => c.id === "dimensions");
    expect(dims?.narrowHide).toBeFalsy();
  });

  it("hides spin/G before power on washers", () => {
    const cols = getCatalogColumns("washers");
    expect(cols.find((c) => c.id === "spinRpm")?.narrowHide).toBe(1);
    expect(cols.find((c) => c.id === "gFactor")?.narrowHide).toBe(1);
    expect(cols.find((c) => c.id === "power")?.narrowHide).toBe(2);
  });
});
