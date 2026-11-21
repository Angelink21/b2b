import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { deriveFamily } from "./families";
import {
  normalizeDescription,
  ParseError,
  parseAirflowM3h,
  parseDimensionsMm,
  parseHeating,
  parseLoadKg,
  parseNoiseDb,
  parseOptionalRangeNumber,
  parsePowerKw,
  parseSectors,
  parseVoltage,
  parseVolumeL,
  parseWorkingSpeedMpm,
  slugify,
} from "./parse";
import { normalizeSearchQuery } from "./query";
import type { CatalogGenerated } from "./schema";

describe("slugify", () => {
  it("maps slash and spaces per DATA_CONTRACT", () => {
    expect(slugify("P-18/100 M E Nomex")).toBe("p-18-100-m-e-nomex");
  });

  it("transliterates Ukrainian model names", () => {
    expect(slugify("ПРАЛЬНЯ TO GO")).toBe("pralnia-to-go");
  });

  it("throws on empty slug after normalization", () => {
    expect(() => slugify("***")).toThrow(ParseError);
    expect(() => slugify("***")).toThrow(/Empty slug/);
  });

  it("keeps existing Latin catalog slugs stable", () => {
    const root = path.resolve(__dirname, "../../..");
    const raw = JSON.parse(
      fs.readFileSync(path.join(root, "src/data/catalog.generated.json"), "utf8"),
    ) as CatalogGenerated;
    const latin = raw.products.filter((p) => !/[а-яА-ЯіІїЇєЄґҐ]/.test(p.name));
    expect(latin.length).toBeGreaterThan(280);
    for (const product of latin) {
      expect(slugify(product.name)).toBe(product.slug);
    }
  });
});

describe("parseLoadKg", () => {
  it("parses #-# range (8-9)", () => {
    expect(parseLoadKg("8-9")).toEqual({ raw: "8-9", min: 8, max: 9 });
  });

  it("parses # x # - # x # (11.7 x 2 - 10.5 x 2)", () => {
    expect(parseLoadKg("11.7 x 2 - 10.5 x 2")).toEqual({
      raw: "11.7 x 2 - 10.5 x 2",
      min: 10.5,
      max: 11.7,
      multiplier: 2,
    });
  });

  it("parses single # (12)", () => {
    expect(parseLoadKg("12")).toEqual({ raw: "12", min: 12, max: 12 });
  });

  it("parses #-#/#-# (18.3-16.5/18-20)", () => {
    expect(parseLoadKg("18.3-16.5/18-20")).toEqual({
      raw: "18.3-16.5/18-20",
      min: 16.5,
      max: 20,
    });
  });

  it("returns null for empty", () => {
    expect(parseLoadKg("")).toBeNull();
  });
});

describe("parsePowerKw", () => {
  it("parses plain number (2.1)", () => {
    expect(parsePowerKw("2.1")).toEqual({ raw: "2.1", max: 2.1 });
  });

  it("parses # (#) (51 (39))", () => {
    expect(parsePowerKw("51 (39)")).toEqual({
      raw: "51 (39)",
      max: 51,
      alt: 39,
    });
  });

  it("parses #/# (2.2/14.2)", () => {
    expect(parsePowerKw("2.2/14.2")).toEqual({
      raw: "2.2/14.2",
      max: 14.2,
      alt: 2.2,
    });
  });
});

describe("parseDimensionsMm", () => {
  it("parses #x#x# (686x829x1019)", () => {
    expect(parseDimensionsMm("686x829x1019")).toEqual({
      w: 686,
      d: 829,
      h: 1019,
    });
  });

  it("parses note (з колесами)", () => {
    expect(parseDimensionsMm("1710 (з колесами) x 810 x 580")).toEqual({
      w: 1710,
      d: 810,
      h: 580,
      note: "з колесами",
    });
  });

  it("allows empty as 0×0×0", () => {
    expect(parseDimensionsMm("")).toEqual({ w: 0, d: 0, h: 0 });
    expect(parseDimensionsMm(null)).toEqual({ w: 0, d: 0, h: 0 });
  });
});

describe("parseNoiseDb", () => {
  it("parses plain (64)", () => {
    expect(parseNoiseDb("64")).toEqual({ value: 64 });
  });

  it("parses lessThan (<70)", () => {
    expect(parseNoiseDb("<70")).toEqual({ value: 70, lessThan: true });
  });

  it("parses slash (62/72)", () => {
    expect(parseNoiseDb("62/72")).toEqual({ value: 62, alt: 72 });
  });
});

describe("parseVolumeL", () => {
  it("parses plain (115)", () => {
    expect(parseVolumeL("115")).toEqual({ raw: "115", value: 115 });
  });

  it("parses #x# (77x2)", () => {
    expect(parseVolumeL("77x2")).toEqual({
      raw: "77x2",
      value: 77,
      multiplier: 2,
    });
  });
});

describe("parseWorkingSpeedMpm", () => {
  it("parses range (1.5-6)", () => {
    expect(parseWorkingSpeedMpm("1.5-6")).toEqual({
      raw: "1.5-6",
      min: 1.5,
      max: 6,
    });
  });

  it("parses single (2.02)", () => {
    expect(parseWorkingSpeedMpm("2.02")).toEqual({
      raw: "2.02",
      min: 2.02,
      max: 2.02,
    });
  });
});

describe("parseAirflowM3h", () => {
  it("parses plain (216)", () => {
    expect(parseAirflowM3h("216")).toEqual({ raw: "216", value: 216 });
  });

  it("parses # x # (500 x 2)", () => {
    expect(parseAirflowM3h("500 x 2")).toEqual({
      raw: "500 x 2",
      value: 500,
      multiplier: 2,
    });
  });
});

describe("parseVoltage", () => {
  it("splits comma variants and keeps raw", () => {
    const raw = "230V III+T, 400V III+N+T";
    expect(parseVoltage(raw)).toEqual({
      raw,
      variants: ["230V III+T", "400V III+N+T"],
    });
  });

  it("keeps exotic spacing as-is", () => {
    const raw = "230V - III + G, 400V - III + N + G";
    expect(parseVoltage(raw)?.variants).toEqual([
      "230V - III + G",
      "400V - III + N + G",
    ]);
  });
});

describe("parseHeating", () => {
  it("maps gas subtypes to heatingVariant", () => {
    expect(parseHeating("Газовий (Radiant Gas)")).toEqual({
      heating: "gas",
      heatingVariant: "Radiant Gas",
    });
    expect(parseHeating("Газовий (Gas Atmo)")).toEqual({
      heating: "gas",
      heatingVariant: "Gas Atmo",
    });
  });

  it("maps empty to null", () => {
    expect(parseHeating("")).toEqual({ heating: null });
  });

  it("maps electric", () => {
    expect(parseHeating("Електричний")).toEqual({ heating: "electric" });
  });
});

describe("parseSectors", () => {
  it("splits pipe-separated industries", () => {
    expect(
      parseSectors(
        "Лікарні та медичні центри|Готелі, хостели та ресторани",
      ),
    ).toEqual({
      sectors: ["hospitals", "hospitality"],
      sectorLabels: [],
      unknown: [],
    });
  });

  it("keeps unknown free labels without throwing", () => {
    expect(
      parseSectors("Лікарні та медичні центри|Військові бази, польові табори"),
    ).toEqual({
      sectors: ["hospitals"],
      sectorLabels: ["Військові бази", "польові табори"],
      unknown: ["Військові бази", "польові табори"],
    });
  });

  it("splits comma-only lists when no known whole segment", () => {
    const result = parseSectors("Готелі, хостели та ресторани");
    expect(result.sectors).toEqual(["hospitality"]);
    expect(result.sectorLabels).toEqual([]);
  });
});

describe("parseOptionalRangeNumber", () => {
  it("parses boilerPowerKw range 6-7.5", () => {
    expect(parseOptionalRangeNumber("6-7.5", "boilerPowerKw")).toEqual({
      raw: "6-7.5",
      min: 6,
      max: 7.5,
    });
  });
});

describe("normalizeDescription", () => {
  it("collapses whitespace and splits bullets", () => {
    const result = normalizeDescription("• one\n• two");
    expect(result.bullets).toEqual(["one", "two"]);
    expect(result.blocks).toEqual([
      { kind: "bullet", text: "one" },
      { kind: "bullet", text: "two" },
    ]);
    expect(result.text.includes("  ")).toBe(false);
  });

  it("collapses 3+ spaces in prose", () => {
    const result = normalizeDescription("Alpha   beta");
    expect(result.text).toBe("Alpha beta");
    expect(result.bullets).toEqual([]);
    expect(result.blocks).toEqual([]);
  });

  it("sentence-cases kit headings and keeps • bullets", () => {
    const result = normalizeDescription(
      "КОМПЛЕКТАЦІЯ\n• Пральна машина\nДо складу входять:\n• Сушильна машина",
    );
    expect(result.blocks).toEqual([
      { kind: "heading", text: "Комплектація" },
      { kind: "bullet", text: "Пральна машина" },
      { kind: "heading", text: "До складу входять:" },
      { kind: "bullet", text: "Сушильна машина" },
    ]);
    expect(result.bullets).toEqual(["Пральна машина", "Сушильна машина"]);
  });
});

describe("deriveFamily", () => {
  it("peels trailing variant tokens", () => {
    expect(deriveFamily("LAP-08 TP2 E V")).toEqual({
      familyId: "lap-08-tp2",
      familyBase: "LAP-08 TP2",
      variantLabel: "E V",
    });
  });

  it("handles Nomex suffix", () => {
    expect(deriveFamily("P-18/100 M E Nomex")).toMatchObject({
      familyBase: "P-18/100 M",
      variantLabel: "E Nomex",
    });
  });

  it("returns null label when no suffix", () => {
    expect(deriveFamily("HAIER HCW12CBD").variantLabel).toBeNull();
  });
});

describe("search normalize", () => {
  it("normalizes case, spaces, dash and slash", () => {
    expect(normalizeSearchQuery("LA-/22  TP2")).toBe("la 22 tp2");
  });
});
