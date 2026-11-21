import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  buildCatalogFromCsvText,
  checkCatalogShrink,
  looksLikeHtmlNotCsv,
  toCatalogPayloads,
} from "./pipeline";

const ROOT = path.join(__dirname, "../../..");
const FULL_CSV = path.join(ROOT, "data", "products_clean.csv");
const FIX = path.join(__dirname, "fixtures");

function readFix(name: string): string {
  return fs.readFileSync(path.join(FIX, name), "utf8");
}

describe("buildCatalogFromCsvText", () => {
  it("builds the full local CSV fixture (runtime mode)", () => {
    const text = fs.readFileSync(FULL_CSV, "utf8");
    const result = buildCatalogFromCsvText(text, { mode: "runtime" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.products.length).toBeGreaterThanOrEqual(303);
    expect(result.series.length).toBeGreaterThan(0);
    expect(result.indexProducts).toHaveLength(result.products.length);

    const { generated, index } = toCatalogPayloads(
      result,
      "2026-01-01T00:00:00.000Z",
    );
    expect(generated.products).toHaveLength(result.products.length);
    expect(index.products).toHaveLength(result.products.length);
  });

  it("returns errors in runtime mode for missing columns", () => {
    const result = buildCatalogFromCsvText(readFix("csv-missing-column.csv"), {
      mode: "runtime",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.join(" ")).toMatch(/missing columns/i);
  });

  it("throws in build mode for date-like cells", () => {
    expect(() =>
      buildCatalogFromCsvText(readFix("csv-dates.csv"), { mode: "build" }),
    ).toThrow(/Простой текст/);
  });

  it("builds a BOM/CRLF Google export with decimal commas", () => {
    const result = buildCatalogFromCsvText(readFix("csv-bom-crlf.csv"), {
      mode: "runtime",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.products).toHaveLength(1);
    expect(result.products[0]?.name).toBe("LAP-08 TP2 E V");
    expect(result.products[0]?.powerKw?.max).toBe(6.25);
    expect(result.warnings.some((w) => /6,25|6\.25/.test(w.message))).toBe(
      true,
    );
  });

  it("rejects HTML auth walls in runtime mode", () => {
    const result = buildCatalogFromCsvText(readFix("csv-html-wall.html"), {
      mode: "runtime",
    });
    // HTML has no contract headers → parse error path.
    expect(result.ok).toBe(false);
  });
});

describe("checkCatalogShrink", () => {
  it("allows normal counts and blocks <80%", () => {
    expect(checkCatalogShrink(300, 303).ok).toBe(true);
    expect(checkCatalogShrink(200, 303).ok).toBe(false);
    expect(checkCatalogShrink(200, 303, { allowShrink: true }).ok).toBe(true);
  });
});

describe("looksLikeHtmlNotCsv", () => {
  it("detects HTML auth walls", () => {
    expect(looksLikeHtmlNotCsv("<!DOCTYPE html><html><body>Sign in</body>")).toBe(
      true,
    );
    expect(looksLikeHtmlNotCsv("name,category\nA,washers\n")).toBe(false);
  });
});
