import { describe, expect, it } from "vitest";

import { hasIndexBlockingParams } from "./robots-policy";

describe("hasIndexBlockingParams", () => {
  it("detects filter and selection params", () => {
    expect(hasIndexBlockingParams({ kg: "8-12" })).toBe(true);
    expect(hasIndexBlockingParams({ m: "lap-08-tp2-e" })).toBe(true);
    expect(hasIndexBlockingParams({ type: "washers", heat: "" })).toBe(true);
  });

  it("ignores empty and unrelated params", () => {
    expect(hasIndexBlockingParams({})).toBe(false);
    expect(hasIndexBlockingParams({ kg: "" })).toBe(false);
    expect(hasIndexBlockingParams({ utm_source: "x" })).toBe(false);
  });
});
