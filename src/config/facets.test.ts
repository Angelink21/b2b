import { describe, expect, it } from "vitest";

import { facetAllowed, facetsForCategory, sortAllowed } from "./facets";

describe("catalog facets", () => {
  it("gives washers kilograms, heating, and power", () => {
    expect(facetsForCategory("washers")).toEqual(["kg", "heating", "power"]);
  });

  it("does not offer kilograms to ironing rollers", () => {
    expect(facetAllowed("ironing-rollers", "kg")).toBe(false);
    expect(facetsForCategory("ironing-rollers")).toEqual([
      "width",
      "speed",
      "heating",
      "power",
    ]);
  });

  it("limits finishing to heating and power", () => {
    expect(facetsForCategory("finishing")).toEqual(["heating", "power"]);
  });

  it("shows only heating when no category is selected", () => {
    expect(facetsForCategory(null)).toEqual(["heating"]);
  });

  it("drops a sort the category table cannot show", () => {
    expect(sortAllowed("ironing-rollers", { by: "kg", dir: "asc" })).toBe(false);
    expect(sortAllowed("washers", { by: "kg", dir: "desc" })).toBe(true);
    expect(sortAllowed(null, { by: "kg", dir: "asc" })).toBe(false);
    expect(sortAllowed(null, { by: "key", dir: "asc" })).toBe(true);
  });
});
