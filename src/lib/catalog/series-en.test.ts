import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { buildCatalogFromCsvText } from "./pipeline";
import { applyEnDescriptionTypography } from "./parse";
import { resolveSeriesCopy } from "./series-copy";

const FIX = path.join(__dirname, "fixtures");

function readFix(name: string): string {
  return fs.readFileSync(path.join(FIX, name), "utf8");
}

describe("EN description columns", () => {
  it("builds without EN columns (empty en)", () => {
    const result = buildCatalogFromCsvText(readFix("csv-tiny.csv"), {
      mode: "runtime",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.enCoverage.seriesWithEnShort).toBe(0);
    expect(result.enCoverage.seriesWithEnFull).toBe(0);
    const series = result.series[0]!;
    expect(series.descriptions.en.short).toBe("");
    expect(series.descriptions.uk.short.length).toBeGreaterThan(0);
  });

  it("propagates partial EN fill across the series", () => {
    const result = buildCatalogFromCsvText(readFix("csv-en-partial.csv"), {
      mode: "runtime",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.products).toHaveLength(2);
    expect(result.series).toHaveLength(1);
    const series = result.series[0]!;
    expect(series.descriptions.en.short).toBe("Suspended washer");
    expect(series.descriptions.en.full).toContain("Stainless steel drum");
    expect(result.enCoverage.seriesWithEnShort).toBe(1);
    expect(result.enCoverage.modelsWithEnShort).toBe(1);

    const copy = resolveSeriesCopy(series, "en");
    expect(copy?.lang).toBe("en");
    expect(copy?.isFallbackUk).toBe(false);
    expect(copy?.short).toBe("Suspended washer");
  });

  it("warns on Cyrillic / EN equals UA", () => {
    const result = buildCatalogFromCsvText(readFix("csv-en-cyrillic.csv"), {
      mode: "runtime",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const messages = result.warnings.map((w) => w.message).join("\n");
    expect(messages).toMatch(/Cyrillic/i);
    expect(messages).toMatch(/equals UA/i);
  });

  it("warns on EN conflict and keeps most frequent", () => {
    const result = buildCatalogFromCsvText(readFix("csv-en-conflict.csv"), {
      mode: "runtime",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const series = result.series[0]!;
    expect(series.descriptions.en.short).toBe("Suspended washer A");
    expect(series.descriptions.en.full).toBe("Full A");
    const messages = result.warnings.map((w) => w.message).join("\n");
    expect(messages).toMatch(/Conflicting EN short/i);
    expect(messages).toMatch(/Conflicting EN full/i);
  });

  it("falls back to Ukrainian on /en when EN empty", () => {
    const result = buildCatalogFromCsvText(readFix("csv-tiny.csv"), {
      mode: "runtime",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const copy = resolveSeriesCopy(result.series[0], "en");
    expect(copy?.isFallbackUk).toBe(true);
    expect(copy?.lang).toBe("uk");
  });
});

describe("applyEnDescriptionTypography", () => {
  it("uses en dash and NBSP before units", () => {
    const out = applyEnDescriptionTypography("Load 8-9 kg and 6.25 kW");
    expect(out).toContain("8\u20139");
    expect(out).toContain("9\u00a0kg");
    expect(out).toContain("6.25\u00a0kW");
  });
});
