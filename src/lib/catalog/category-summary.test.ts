import { describe, expect, it } from "vitest";

import {
  buildCategorySummary,
  formatCategoryMetricLead,
  formatCategoryMetricRange,
} from "./category-summary";
import { getSnapshotIndex } from "./index";
import { CATEGORY_SLUGS } from "./schema";

function summary(slug: Parameters<typeof buildCategorySummary>[0]) {
  return buildCategorySummary(slug, getSnapshotIndex());
}

describe("category summary", () => {
  it("reports model counts that sum to the full index", () => {
    const index = getSnapshotIndex();
    const total = CATEGORY_SLUGS.reduce(
      (sum, slug) => sum + summary(slug).count,
      0,
    );
    expect(total).toBe(index.length);
  });

  it("exposes kg for washers and width for ironing rollers", () => {
    const washers = summary("washers");
    expect(washers.metricKind).toBe("kg");
    expect(washers.metricMin).not.toBeNull();
    expect(washers.metricMax).toBeGreaterThanOrEqual(washers.metricMin ?? 0);

    const rollers = summary("ironing-rollers");
    expect(rollers.metricKind).toBe("width");
    expect(rollers.metricMin).not.toBeNull();

    const carts = summary("laundry-carts");
    expect(carts.metricKind).toBe("volume");
    expect(carts.metricMin).not.toBeNull();
  });

  it("formats ranges with a no-break space before the unit", () => {
    const washers = summary("washers");
    const label = formatCategoryMetricRange(washers, "uk", {
      kg: "кг",
      mm: "мм",
      L: "л",
      kW: "кВт",
    });
    expect(label).toMatch(/\u00A0кг$/);
  });

  it("formats named lead without a model-count prefix", () => {
    const ironers = summary("flatwork-ironers");
    const lead = formatCategoryMetricLead(
      ironers,
      "uk",
      { kg: "кг", mm: "мм", L: "л", kW: "кВт" },
      {
        kg: "Завантаження",
        width: "Робоча ширина",
        volume: "Об’єм",
        power: "Потужність",
      },
    );
    expect(lead).toMatch(/^Робоча ширина /);
    expect(lead).toMatch(/\u00A0мм$/);
    expect(lead).not.toMatch(/модел/);
  });

  it("washer-dryers lead keeps one decimal (SLN-18 16,5–20, not 17)", () => {
    const s = summary("washer-dryers");
    expect(s.metricMin).toBe(16.5);
    expect(s.metricMax).toBe(20);
    const lead = formatCategoryMetricLead(
      s,
      "uk",
      { kg: "кг", mm: "мм", L: "л", kW: "кВт" },
      {
        kg: "Завантаження",
        width: "Робоча ширина",
        volume: "Об’єм",
        power: "Потужність",
      },
    );
    expect(lead).toBe("Завантаження 16,5–20\u00A0кг");
  });
});
