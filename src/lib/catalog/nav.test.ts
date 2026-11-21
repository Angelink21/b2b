import { describe, expect, it } from "vitest";

import { CATEGORY_SLUGS } from "./schema";
import { getSnapshotIndex } from "./index";
import { buildCategoryNavStats, formatNavLoad } from "./nav";

describe("category nav stats", () => {
  it("counts every indexed model once", () => {
    const index = getSnapshotIndex();
    const stats = buildCategoryNavStats(index);
    expect(stats).toHaveLength(CATEGORY_SLUGS.length);
    expect(stats.reduce((sum, stat) => sum + stat.count, 0)).toBe(
      index.length,
    );
  });

  it("exposes a kg range only for washers and dryers", () => {
    const stats = buildCategoryNavStats(getSnapshotIndex());
    const bySlug = Object.fromEntries(stats.map((stat) => [stat.slug, stat]));

    expect(bySlug.washers?.loadMin).not.toBeNull();
    expect(bySlug.washers?.loadMax).toBeGreaterThanOrEqual(
      bySlug.washers?.loadMin ?? 0,
    );
    expect(bySlug.dryers?.loadMin).not.toBeNull();
    expect(bySlug.dryers?.loadMax).toBeGreaterThanOrEqual(
      bySlug.dryers?.loadMin ?? 0,
    );

    for (const slug of [
      "flatwork-ironers",
      "laundry-carts",
      "ironing-rollers",
      "finishing",
      "water-recovery",
      "washer-dryers",
      "mobile-laundry",
    ] as const) {
      expect(bySlug[slug]?.loadMin).toBeNull();
      expect(bySlug[slug]?.loadMax).toBeNull();
    }
  });

  it("formats the load range with a no-break space before the unit", () => {
    expect(formatNavLoad(8, 120, "uk", "кг")).toBe("8–120\u00A0кг");
    expect(formatNavLoad(11, 11, "en", "kg")).toBe("11\u00A0kg");
  });
});
