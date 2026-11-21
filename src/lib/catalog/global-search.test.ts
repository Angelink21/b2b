import { describe, expect, it } from "vitest";

import type { GlobalSearchItem } from "./global-search";
import { groupSearchResults, searchHaystack } from "./global-search";

function item(
  slug: string,
  name: string,
  category: GlobalSearchItem["category"],
): GlobalSearchItem {
  return {
    slug,
    name,
    category,
    photo: null,
    dimensionsMm: { w: 600, d: 600, h: 1000 },
    loadKg: { min: 20, max: 20 },
    powerKwMax: 5,
    workingWidthMm: null,
    volumeL: null,
  };
}

describe("global search", () => {
  it("normalizes model names like catalog search", () => {
    expect(searchHaystack("LA-28")).toBe("la 28");
    expect(searchHaystack("LA/28")).toBe("la 28");
  });

  it("groups matches by category with at most eight total", () => {
    const items = [
      item("la28", "LA-28", "washers"),
      item("la29", "LA-29", "washers"),
      item("ld1", "LD-100", "dryers"),
      ...Array.from({ length: 10 }, (_, i) =>
        item(`x${i}`, `WX-${i}`, "washers"),
      ),
    ];
    const groups = groupSearchResults(items, "la");
    const total = groups.reduce((sum, g) => sum + g.items.length, 0);
    expect(total).toBeLessThanOrEqual(8);
    expect(groups[0]?.category).toBe("washers");
    expect(groups.some((g) => g.items.some((r) => r.name === "LA-28"))).toBe(
      true,
    );
  });
});