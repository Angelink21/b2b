import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

import {
  applyGoogleSheetQuirks,
  CatalogCsvError,
  checkCsvHeaders,
  describeCsvUrl,
  fetchCatalogCsvText,
  looksLikeSheetDate,
  normalizeDecimalCommas,
  parseCatalogCsvText,
  REQUIRED_CSV_COLUMNS,
} from "./csv-source";
import { CSV_COLUMNS } from "./normalize";

const FIX = path.join(__dirname, "fixtures");

function readFix(name: string): string {
  return fs.readFileSync(path.join(FIX, name), "utf8");
}

describe("describeCsvUrl", () => {
  it("never echoes the full URL", () => {
    const url =
      "https://docs.google.com/spreadsheets/d/e/2PACX-SECRET/pub?output=csv";
    const label = describeCsvUrl(url);
    expect(label).toContain("docs.google.com");
    expect(label).toContain(`${url.length} chars`);
    expect(label).not.toContain("2PACX-SECRET");
    expect(label).not.toContain("output=csv");
  });
});

describe("looksLikeSheetDate", () => {
  it("detects month-name corruption and serials", () => {
    expect(looksLikeSheetDate("8 сент.")).toBe(true);
    expect(looksLikeSheetDate("8 Sept")).toBe(true);
    expect(looksLikeSheetDate("45200")).toBe(true);
    expect(looksLikeSheetDate("08.09.2024")).toBe(true);
  });

  it("allows real catalog values", () => {
    expect(looksLikeSheetDate("8-9")).toBe(false);
    expect(looksLikeSheetDate("2.02")).toBe(false);
    expect(looksLikeSheetDate("2,02")).toBe(false);
    expect(looksLikeSheetDate("62/72")).toBe(false);
    expect(looksLikeSheetDate("6.25")).toBe(false);
    expect(looksLikeSheetDate("1.5-6")).toBe(false);
  });
});

describe("normalizeDecimalCommas", () => {
  it("coerces 2,02 → 2.02", () => {
    expect(normalizeDecimalCommas("2,02")).toEqual({
      text: "2.02",
      coerced: true,
    });
  });

  it("leaves list-like commas alone when not digit-digit", () => {
    expect(normalizeDecimalCommas("230V III+T, 400V").coerced).toBe(false);
  });
});

describe("parseCatalogCsvText fixtures", () => {
  it("accepts decimal-comma cells and coerces them", () => {
    const parsed = parseCatalogCsvText(readFix("csv-commas.csv"));
    expect(parsed.headers).toHaveLength(REQUIRED_CSV_COLUMNS.length);
    const quirks = applyGoogleSheetQuirks(parsed.rows);
    expect(quirks.warnings.length).toBeGreaterThan(0);
    expect(quirks.rows[0]?.[CSV_COLUMNS.workingSpeedMpm]).toBe("2.02");
  });

  it("fails on date-like loadKg with column and model in the error", () => {
    const parsed = parseCatalogCsvText(readFix("csv-dates.csv"));
    expect(() => applyGoogleSheetQuirks(parsed.rows)).toThrow(CatalogCsvError);
    try {
      applyGoogleSheetQuirks(parsed.rows);
      expect.unreachable("expected date quirk to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(CatalogCsvError);
      const message = err instanceof Error ? err.message : String(err);
      expect(message).toMatch(/Простой текст/);
      expect(message).toContain(CSV_COLUMNS.loadKg);
      expect(message).toContain("LAP-08 TP2 E V");
      expect(message).toMatch(/8 сент/);
    }
  });

  it("fails on Excel serial dates with column and model", () => {
    const parsed = parseCatalogCsvText(readFix("csv-date-serial.csv"));
    try {
      applyGoogleSheetQuirks(parsed.rows);
      expect.unreachable("expected serial date to throw");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      expect(message).toContain(CSV_COLUMNS.loadKg);
      expect(message).toContain("SERIAL-MODEL");
      expect(message).toMatch(/45200/);
    }
  });

  it("handles BOM, CRLF, quoted newlines, edge spaces, and list commas", () => {
    const raw = readFix("csv-bom-crlf.csv");
    expect(raw.charCodeAt(0)).toBe(0xfeff);
    expect(raw).toContain("\r\n");

    const parsed = parseCatalogCsvText(raw);
    expect(parsed.headers[0]).toBe(CSV_COLUMNS.name);
    expect(parsed.rows).toHaveLength(1);

    const quirks = applyGoogleSheetQuirks(parsed.rows);
    const row = quirks.rows[0]!;
    // Name still has edge spaces here; normalizeRow trims via cell().
    expect(row[CSV_COLUMNS.name]).toBe("  LAP-08 TP2 E V  ");
    expect(row[CSV_COLUMNS.powerKw]).toBe("6.25");
    expect(row[CSV_COLUMNS.voltage]).toBe("230V I+N+T, 400V III+N+T");
    expect(row[CSV_COLUMNS.fullDescription]).toContain("Рядок один");
    expect(row[CSV_COLUMNS.fullDescription]).toContain("Рядок два");
    expect(
      quirks.warnings.some((w) =>
        w.message.includes(CSV_COLUMNS.powerKw) && w.message.includes("6,25"),
      ),
    ).toBe(true);
  });

  it("ignores unexpected extra columns (keeps required data)", () => {
    const parsed = parseCatalogCsvText(readFix("csv-extra-column.csv"));
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0]?.[CSV_COLUMNS.name]).toBe("LAP-08 TP2 E V");
    const check = checkCsvHeaders(parsed.headers);
    expect(check.unexpected).toContain("secret_notes");
    expect(check.missing).toEqual([]);
  });

  it("rejects missing required columns", () => {
    expect(() =>
      parseCatalogCsvText(readFix("csv-missing-column.csv")),
    ).toThrow(/missing columns/);
    expect(() =>
      parseCatalogCsvText(readFix("csv-missing-column.csv")),
    ).toThrow(/Зображення/);
  });

  it("allows optional image_id", () => {
    const parsed = parseCatalogCsvText(readFix("csv-image-id.csv"));
    expect(parsed.hasImageId).toBe(true);
    expect(parsed.rows[0]?.image_id).toBe("custom-lap-08");
  });

  it("ignores column order (permute headers check)", () => {
    const shuffled = [...REQUIRED_CSV_COLUMNS].reverse();
    const check = checkCsvHeaders(shuffled);
    expect(check.missing).toEqual([]);
    expect(check.unexpected).toEqual([]);
  });
});

describe("fetchCatalogCsvText", () => {
  it("retries then succeeds without network", async () => {
    let calls = 0;
    const fetchImpl = vi.fn(async () => {
      calls += 1;
      if (calls < 2) {
        throw new Error("boom");
      }
      return new Response("a,b\n1,2\n", {
        status: 200,
        headers: { "Content-Type": "text/csv" },
      });
    });

    const text = await fetchCatalogCsvText(
      "https://example.com/catalog.csv",
      { fetchImpl, retries: 3, timeoutMs: 1000 },
    );
    expect(text).toContain("a,b");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("does not retry HTTP 4xx", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response("nope", {
          status: 401,
          headers: { "Content-Type": "text/html" },
        }),
    );
    await expect(
      fetchCatalogCsvText("https://example.com/x.csv", {
        fetchImpl,
        retries: 3,
      }),
    ).rejects.toThrow(/HTTP 401/);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
