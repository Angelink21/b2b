import { describe, expect, it } from "vitest";

import { parseAsCatalogSort, parseAsKgRange } from "./search-params";

describe("catalog search param parsers", () => {
  it("parses kg range", () => {
    expect(parseAsKgRange.parse("23-53")).toEqual({ min: 23, max: 53 });
    expect(parseAsKgRange.parse("53-23")).toBeNull();
    expect(parseAsKgRange.serialize({ min: 8, max: 130 })).toBe("8-130");
  });

  it("parses sort", () => {
    expect(parseAsCatalogSort.parse("kg:desc")).toEqual({
      by: "kg",
      dir: "desc",
    });
    expect(parseAsCatalogSort.parse("nope:asc")).toBeNull();
    expect(parseAsCatalogSort.serialize({ by: "name", dir: "asc" })).toBe(
      "name:asc",
    );
  });
});
