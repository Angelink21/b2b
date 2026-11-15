import { describe, expect, it } from "vitest";

import {
  formatCategoryMetricLead,
  formatCategoryMetricRange,
  getCategorySummary,
} from "./category-summary";

describe("category summary", () => {
  it("reports model counts that sum to the full index", () => {
    const slugs = [
      "washers",
      "dryers",
      "flatwork-ironers",
      "laundry-carts",
      "ironing-rollers",
      "finishing",
      "water-recovery",
      "washer-dryers",
    ] as const;
    const total = slugs.reduce(
      (sum, slug) => sum + getCategorySummary(slug).count,
      0,
    );
    expect(total).toBe(303);
  });

  it("exposes kg for washers and width for ironing rollers", () => {
    const washers = getCategorySummary("washers");
    expect(washers.metricKind).toBe("kg");
    expect(washers.metricMin).not.toBeNull();
    expect(washers.metricMax).toBeGreaterThanOrEqual(washers.metricMin ?? 0);

    const rollers = getCategorySummary("ironing-rollers");
    expect(rollers.metricKind).toBe("width");
    expect(rollers.metricMin).not.toBeNull();

    const carts = getCategorySummary("laundry-carts");
    expect(carts.metricKind).toBe("volume");
    expect(carts.metricMin).not.toBeNull();
  });

  it("formats ranges with a no-break space before the unit", () => {
    const washers = getCategorySummary("washers");
    const label = formatCategoryMetricRange(washers, "uk", {
      kg: "кг",
      mm: "мм",
      L: "л",
      kW: "кВт",
    });
    expect(label).toMatch(/\u00A0кг$/);
  });

  it("formats named lead without a model-count prefix", () => {
    const ironers = getCategorySummary("flatwork-ironers");
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
    const summary = getCategorySummary("washer-dryers");
    expect(summary.metricMin).toBe(16.5);
    expect(summary.metricMax).toBe(20);
    const lead = formatCategoryMetricLead(
      summary,
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
