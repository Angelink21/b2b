import { describe, expect, it } from "vitest";

import {
  formatDimensionsMm,
  formatIndexLoadKg,
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
    expect(formatIndexLoadKg({ min: 8, max: 9 })).toBe("8–9");
    expect(formatIndexLoadKg({ min: 12, max: 12 })).toBe("12");
  });
});
