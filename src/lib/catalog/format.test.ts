import { describe, expect, it } from "vitest";

import {
  formatCatalogNumber,
  formatDimensionsMm,
  formatIndexDimensions,
  formatIndexLoadKg,
  formatIndexPower,
  formatIndexSpeed,
  formatNoiseDb,
  formatPowerKw,
  formatVoltage,
} from "./format";

describe("catalog formatters", () => {
  it("formats power raw including alt forms", () => {
    expect(formatPowerKw({ raw: "51 (39)", max: 51, alt: 39 })).toBe("51 (39)");
  });

  it("formats dimensions and optional note", () => {
    expect(formatDimensionsMm({ w: 686, d: 829, h: 1019 })).toBe(
      "686×829×1019",
    );
    expect(
      formatDimensionsMm({
        w: 1710,
        d: 810,
        h: 580,
        note: "з колесами",
      }),
    ).toBe("1710×810×580 (з колесами)");
  });

  it("formats noise lessThan and alt", () => {
    expect(formatNoiseDb({ value: 70, lessThan: true })).toBe("<70");
    expect(formatNoiseDb({ value: 62, alt: 72 })).toBe("62/72");
  });

  it("formats voltage from raw or array", () => {
    expect(formatVoltage(["230V I+N+T"], "230V I+N+T")).toBe("230V I+N+T");
    expect(formatVoltage(["a", "b"], null)).toBe("a, b");
  });

  it("formats index load range", () => {
    expect(formatIndexLoadKg({ min: 8, max: 9 }, "uk")).toBe("8–9");
    expect(formatIndexLoadKg({ min: 12, max: 12 }, "uk")).toBe("12");
  });

  it("keeps one decimal for SLN-18 style load (not rounded to 17)", () => {
    expect(formatIndexLoadKg({ min: 16.5, max: 20 }, "uk")).toBe("16,5–20");
    expect(formatIndexLoadKg({ min: 16.5, max: 20 }, "en")).toBe("16.5–20");
  });

  it("formats catalog numbers with uk grouping and decimal comma", () => {
    expect(formatCatalogNumber("uk", 1400)).toBe("1\u00A0400");
    expect(formatCatalogNumber("uk", 10.84)).toBe("10,84");
    expect(formatIndexPower(10.84, "uk")).toBe("10,84");
    expect(formatIndexSpeed({ min: 1.5, max: 6 }, "uk")).toBe("1,5–6");
    expect(formatIndexDimensions({ w: 1400, d: 444, h: 1110 }, "uk")).toBe(
      "1400\u00A0×\u00A0444\u00A0×\u00A01110",
    );
    expect(formatIndexDimensions({ w: 1836, d: 1710, h: 2245 }, "uk")).toBe(
      "1836\u00A0×\u00A01710\u00A0×\u00A02245",
    );
  });
});
